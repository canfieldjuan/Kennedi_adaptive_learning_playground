#!/usr/bin/env python3
"""The bedtime book's illustration recipe: character sheets and story pages from a licence-allowlisted Qwen-Image
stack.

  python3 storybook/tools/story-recipe.py character pippa
      Render four seeds of Pippa's character sheet, a contact sheet and a draft recipe into
      design-source/characters/drafts/.
  python3 storybook/tools/story-recipe.py lock pippa --seed 72 [--force]
      Lock the pick as design-source/characters/locked/pippa.png, with a recipe recording each file's SHA-256.
  python3 storybook/tools/story-recipe.py page pippa-and-the-whispering-moss 4
      Render four seeds of page 4 of that story's page plan, with the cast's locked sheets as reference images,
      plus a contact sheet and a draft recipe, into design-source/pages/<story>/drafts/.
  python3 storybook/tools/story-recipe.py lock-page pippa-and-the-whispering-moss 4 --seed 83 [--force]
      Lock the pick as design-source/pages/<story>/locked/page-04.png, with its recipe.
  python3 storybook/tools/story-recipe.py selftest
      Check every story's page plan, and that every lock rebuilds from its recipe, the current canon, story and
      locked sheets, that its files match their digests, that every file in a locked folder has one owner, and
      that every model it names is on the licence allowlist. No ComfyUI needed.

The canon is storybook/canon/moon-berry-forest.json, a snapshot of bedtime_broadcast's WORLD_BIBLE; the stories
in storybook/stories/ are snapshots of its published stories, each with a page plan. Renders need a running
ComfyUI (--server, default http://127.0.0.1:8188) that can see the allowlisted models. Needs Pillow. One operator
on one machine: the tool takes one lock on the storybook folder while it commits, and hardening against
concurrent or adversarial use beyond that is out of scope.
"""
import argparse
import contextlib
import fcntl
import hashlib
import io
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

STORYBOOK = Path(__file__).resolve().parents[1]
CANON = "canon/moon-berry-forest.json"
DRAFTS, LOCKED = "design-source/characters/drafts", "design-source/characters/locked"
STORIES, PAGES = "stories", "design-source/pages"
STORY_NAME = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
SEEDS = (61, 72, 83, 94)

# Every model the book renders with, by role: its file, where it comes from, its licence and the SHA-256 the Hub
# publishes for it, all verified 2026-10-04 (the local copies matched). A recipe can name only these files. The
# tool can't see which bytes ComfyUI loads under these names; that is the machine's model configuration, and the
# digests are here to check it against.
MODELS = {
    "unet": {"file": "qwen-image-Q8_0.gguf", "source": "city96/Qwen-Image-gguf", "license": "apache-2.0",
             "sha256": "43142b32778dc0568c27395abc6f8291ac53f1de0b98eed919712cf161f248de"},
    "clip": {"file": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
             "source": "Comfy-Org/Qwen-Image_ComfyUI (from Qwen/Qwen2.5-VL-7B-Instruct)", "license": "apache-2.0",
             "sha256": "cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4"},
    "vae": {"file": "qwen_image_vae.safetensors", "source": "Comfy-Org/Qwen-Image_ComfyUI", "license": "apache-2.0",
            "sha256": "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f"},
    # Pages only: the edit model takes up to three reference images (verified 2026-10-04, local copy matched).
    "edit_unet": {"file": "qwen-image-edit-2511-Q4_K_S.gguf",
                  "source": "unsloth/Qwen-Image-Edit-2511-GGUF (from Qwen/Qwen-Image-Edit-2511)", "license": "apache-2.0",
                  "sha256": "df952ef0d2b46463bd95d9afbb78e045ec5412316f453a7ad5a3d7bcbb111b72"},
}
LOADERS = {"unet": ("UnetLoaderGGUF", "unet_name"), "clip": ("CLIPLoader", "clip_name"), "vae": ("VAELoader", "vae_name"),
           "edit_unet": ("UnetLoaderGGUF", "unet_name")}
SHEET_ROLES, PAGE_ROLES = ("unet", "clip", "vae"), ("edit_unet", "clip", "vae")

# Versions are never edited: a lock must keep rebuilding from its recipe, so a change is a new version.
# v2 (2026-10-04, after the first real renders): "moonlit" drew a moon in 9 of 12 v1 sheets, and Bramble came out
# with four legs and two arms; sheets now stand upright on two hind legs. No prompt names the moon: "no moon" drew
# one in all 8 first v2 renders, and a "moon, night sky" negative prompt swung every colour orange.
SHEET_TEMPLATES = {
    "v1": {
        "style": ("soft storybook watercolor illustration, gentle warm moonlit palette, clean confident outlines, "
                  "cozy picture-book style"),
        "text": ("{style}. A single {build} {species} standing in a relaxed three-quarter view, {base_colors}{garment}"
                 "{props}, {accent}, plain soft cream background, full body, centered, no text"),
    },
    "v2": {
        "style": ("soft storybook watercolor illustration, gentle warm palette, clean confident outlines, "
                  "cozy picture-book style"),
        "text": ("{style}. A single {build} {species} standing upright on two hind legs in a relaxed three-quarter "
                 "view, {base_colors}{garment}{props}, {accent}, plain soft cream background, full body, centered, "
                 "no text"),
    },
}
# ComfyUI's own Qwen-Image defaults (its "Text to Image (Qwen-Image)" blueprint).
RENDERS = {"v1": {"size": 1328, "shift": 3.1, "steps": 20, "cfg": 4.0, "sampler": "euler", "scheduler": "simple"}}
TEMPLATE, RENDER = "v2", "v1"
# A page names its cast by picture number: ComfyUI's encoder puts "Picture 1:", "Picture 2:" before the reference
# images. The times are a closed set, wide enough for the later stories, so they don't force a new version.
PAGE_TEMPLATES = {"v1": {
    "style": SHEET_TEMPLATES["v1"]["style"],
    "text": ("{style}. {cast}, each drawn exactly as in their picture. {scene}. The setting is {place}, in {season}, "
             "{light}. A full-page storybook illustration with no text."),
    "lights": {"morning": "soft early-morning light", "day": "gentle bright daylight",
               "late-afternoon": "warm golden late-afternoon light through the trees", "dusk": "deep amber dusk light",
               "evening": "soft blue evening light", "night": "quiet silver moonlight"},
}}
# v2: the same text and times with the v2 style, so a page's moonlight comes only from its time of day (night).
PAGE_TEMPLATES["v2"] = {**PAGE_TEMPLATES["v1"], "style": SHEET_TEMPLATES["v2"]["style"]}
# ComfyUI's "Image Edit (Qwen 2511)" blueprint, except that the page size is the recipe's (an empty latent) rather
# than image1's, and the model is the GGUF; the reference method is the one its note says repackaged files need.
PAGE_RENDERS = {"v1": {"size": 1328, "shift": 3.1, "cfg_norm": 1.0, "reference_method": "index_timestep_zero",
                       "steps": 40, "cfg": 4.0, "sampler": "euler", "scheduler": "simple"}}
PAGE_TEMPLATE, PAGE_RENDER = "v2", "v1"
PAGE_KEYS = {"cast", "place", "time", "scene"}
# Keys a recipe gains outside draft_manifest(): the ComfyUI version and the candidates' SHA-256, noted at render
# time, and what `lock` adds.
ADDED_KEYS = {"comfyui_version", "candidates", "chosen_seed", "source", "files"}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def real_folder(rel):
    """STORYBOOK/rel, refused if the way there goes through a symlink: the tool writes only inside the storybook."""
    path = STORYBOOK / rel
    if path.resolve() != path:
        sys.exit(f"{rel} goes through a symlink to {path.resolve()}; the tool writes only into the storybook's "
                 f"real folders")
    return path


def load_canon():
    return json.loads((STORYBOOK / CANON).read_text())


def character(canon, name):
    """The canon character called name (any case), or exit: only canon characters have sheets."""
    found = [c for c in canon["characters"] if c["name"].lower() == str(name).lower()]
    if not found:
        sys.exit(f"{name!r} is not a character in {CANON}: {', '.join(c['name'] for c in canon['characters'])}")
    return found[0]


def sheet_prompt(template, appearance):
    props = appearance["signature_props"]
    listed = props[0] if len(props) == 1 else ", ".join(props[:-1]) + " and " + props[-1] if props else ""
    garment = appearance["signature_garment"]
    return template["text"].format(
        style=template["style"], build=appearance["build"], species=appearance["species"],
        base_colors=appearance["base_colors"], garment=f", wearing a {garment}" if garment else "",
        props=f", with {listed}" if listed else "", accent=appearance["accent_notes"])


def recipe_graph(recipe, seed, prefix):
    """The graph a recipe renders at a seed, built from what the recipe records and nothing else."""
    settings, files = recipe["settings"], {m["role"]: m["file"] for m in recipe["models"]}
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": files["unet"]}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": files["clip"], "type": "qwen_image",
                                                     "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": files["vae"]}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": settings["shift"]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": recipe["prompt"]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": ""}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": settings["size"], "height": settings["size"],
                                                               "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {
            "model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0], "seed": seed,
            "steps": settings["steps"], "cfg": settings["cfg"], "sampler_name": settings["sampler"],
            "scheduler": settings["scheduler"], "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


def draft_manifest(name, template_version, render_version, canon):
    """Everything a character-sheet recipe records about how it renders, built from its inputs alone.

    `character` writes what this returns; `lock` and `selftest` rebuild it from a recipe's inputs and compare
    every key, so a recorded value can't say something its render doesn't, and a canon change fails the locks
    it described.
    """
    appearance = character(canon, name)["appearance"]
    template = SHEET_TEMPLATES[template_version]
    manifest = {"kind": "character-sheet", "name": name, "template_version": template_version,
                "render_version": render_version, "canon": appearance, "template": template,
                "prompt": sheet_prompt(template, appearance), "settings": RENDERS[render_version],
                "models": [{"role": role, **MODELS[role]} for role in ("unet", "clip", "vae")],
                "seeds": list(SEEDS)}
    manifest["graph"] = recipe_graph(manifest, 0, f"storybook/{name}")
    return manifest


def allowlist_problems(manifest):
    allowed = {m["file"] for m in MODELS.values()}
    return [f"model {model!r} is not on the licence allowlist"
            for model in (manifest.get("models") if isinstance(manifest.get("models"), list) else [])
            if not isinstance(model, dict) or model.get("file") not in allowed]


def rebuild_problems(png, manifest, expected, seed, build_graph, what):
    """Why png and its recipe are not what the tool rebuilds from the recipe's inputs (expected) at this seed; an
    empty list when they are. build_graph is the graph builder for this kind of recipe."""
    problems = []
    for key in sorted(set(manifest) | set(expected)):
        if key in expected and key not in manifest:
            problems.append(f"it does not record {key}")
        elif key in expected and manifest[key] != expected[key]:
            problems.append(f"its recorded {key} is not what the tool records for {what}")
        elif key not in expected and key not in ADDED_KEYS:
            problems.append(f"it records {key}, which the tool does not")
    image = Image.open(png)
    if "prompt" not in image.info:
        return problems + [f"{png.name} has no embedded graph"]
    if image.size != (expected["settings"]["size"],) * 2:
        problems.append(f"{png.name} is {image.size[0]}x{image.size[1]}, not the recipe's size")
    graph = json.loads(image.info["prompt"])
    nodes = {node["class_type"]: node["inputs"] for node in graph.values()}
    if nodes.get("KSampler", {}).get("seed") != seed:
        problems.append(f"it was rendered at seed {nodes.get('KSampler', {}).get('seed')}, not {seed}")
    if graph != build_graph(expected, seed, nodes.get("SaveImage", {}).get("filename_prefix")):
        problems.append(f"its embedded graph is not the one its recipe renders at seed {seed}")
    return problems


def embedded_problems(png, manifest, seed, canon):
    """Why png is not the character sheet its recipe describes at this seed; an empty list when it is."""
    problems = allowlist_problems(manifest)
    if (manifest.get("template_version") not in SHEET_TEMPLATES or manifest.get("render_version") not in RENDERS
            or not any(c["name"].lower() == str(manifest.get("name")).lower() for c in canon["characters"])):
        return problems + ["its name, template_version or render_version is not one the tool knows"]
    expected = draft_manifest(manifest["name"], manifest["template_version"], manifest["render_version"], canon)
    return problems + rebuild_problems(png, manifest, expected, seed, recipe_graph, "this character and canon")


def load_story(name):
    """The story called name, from storybook/stories/, or exit."""
    path = STORYBOOK / STORIES / f"{name}.json"
    if not STORY_NAME.fullmatch(str(name)) or not path.is_file():
        known = sorted(p.stem for p in (STORYBOOK / STORIES).glob("*.json")) if (STORYBOOK / STORIES).is_dir() else []
        sys.exit(f"{name!r} is not a story in {STORIES}/: {', '.join(known) or 'none yet'}")
    return json.loads(path.read_text())


def paragraphs(text):
    return [p for p in re.split(r"\n[ \t]*\n", text.strip()) if p.strip()]


def story_problems(story, canon):
    """Why a story's snapshot and page plan can't be drawn from; an empty list when they can."""
    source = story.get("source") if isinstance(story.get("source"), dict) else {}
    text = story.get("text")
    if not isinstance(text, str) or hashlib.sha256(text.encode()).hexdigest() != source.get("content_sha256"):
        return ["its text does not hash to its recorded content_sha256 (the snapshot was edited)"]
    problems, names = [], [c["name"] for c in canon["characters"]]
    if not isinstance(story.get("season"), str) or not story["season"].strip():
        problems.append("it has no season")
    pages = story.get("pages") if isinstance(story.get("pages"), list) else []
    lights = PAGE_TEMPLATES[PAGE_TEMPLATE]["lights"]
    if len(pages) != len(paragraphs(text)):
        problems.append(f"it plans {len(pages)} pages for {len(paragraphs(text))} paragraphs; a page plan has one "
                        f"page per paragraph")
    for number, page in enumerate(pages, 1):
        if not isinstance(page, dict) or set(page) != PAGE_KEYS:
            problems.append(f"page {number} is not exactly {sorted(PAGE_KEYS)}")
            continue
        cast = page["cast"]
        if not (isinstance(cast, list) and 1 <= len(cast) <= 3 and len(set(map(str, cast))) == len(cast)):
            problems.append(f"page {number}'s cast {cast!r} is not one to three different characters (the edit "
                            f"model takes three references)")
        elif any(name not in names for name in cast):
            problems.append(f"page {number}'s cast {cast!r} names someone who is not a character in {CANON}")
        if not isinstance(page["time"], str) or page["time"] not in lights:
            problems.append(f"page {number}'s time {page['time']!r} is not one of {', '.join(lights)}")
        for key in ("place", "scene"):
            if not isinstance(page[key], str) or not page[key].strip():
                problems.append(f"page {number} has no {key}")
    return problems


def page_number(name, story, number):
    if not 1 <= number <= len(story["pages"]):
        sys.exit(f"{name} has pages 1 to {len(story['pages'])}; there is no page {number}")
    return number


def page_stem(number):
    return f"page-{number:02d}"


def page_folder(name, kind):
    return f"{PAGES}/{name}/{kind}"


def reference_name(digest):
    """The name a locked sheet is uploaded under: its content, so the recipe alone determines the graph."""
    return f"storybook-{digest}.png"


def page_prompt(template, story, page, cast):
    clauses = [f"{name} is the {species} in picture {i}" for i, (name, species) in enumerate(cast, 1)]
    listed = clauses[0] if len(clauses) == 1 else ", ".join(clauses[:-1]) + " and " + clauses[-1]
    return template["text"].format(style=template["style"], cast=listed, scene=page["scene"], place=page["place"],
                                   season=story["season"], light=template["lights"][page["time"]])


def page_graph(recipe, seed, prefix):
    """The edit graph a page recipe renders at a seed, built from what the recipe records and nothing else. The
    cast's sheets are image1 to image3, in cast order, on both the prompt and the empty negative."""
    settings, files = recipe["settings"], {m["role"]: m["file"] for m in recipe["models"]}
    images = {f"image{i}": [str(20 + i), 0] for i in range(1, len(recipe["references"]) + 1)}
    graph = {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": files["edit_unet"]}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": files["clip"], "type": "qwen_image",
                                                     "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": files["vae"]}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": settings["shift"]}},
        "5": {"class_type": "CFGNorm", "inputs": {"model": ["4", 0], "strength": settings["cfg_norm"]}},
        "6": {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {
            "clip": ["2", 0], "prompt": recipe["prompt"], "vae": ["3", 0], **images}},
        "7": {"class_type": "TextEncodeQwenImageEditPlus", "inputs": {
            "clip": ["2", 0], "prompt": "", "vae": ["3", 0], **images}},
        "8": {"class_type": "FluxKontextMultiReferenceLatentMethod", "inputs": {
            "conditioning": ["6", 0], "reference_latents_method": settings["reference_method"]}},
        "9": {"class_type": "FluxKontextMultiReferenceLatentMethod", "inputs": {
            "conditioning": ["7", 0], "reference_latents_method": settings["reference_method"]}},
        "10": {"class_type": "EmptySD3LatentImage", "inputs": {"width": settings["size"], "height": settings["size"],
                                                               "batch_size": 1}},
        "11": {"class_type": "KSampler", "inputs": {
            "model": ["5", 0], "positive": ["8", 0], "negative": ["9", 0], "latent_image": ["10", 0], "seed": seed,
            "steps": settings["steps"], "cfg": settings["cfg"], "sampler_name": settings["sampler"],
            "scheduler": settings["scheduler"], "denoise": 1.0}},
        "12": {"class_type": "VAEDecode", "inputs": {"samples": ["11", 0], "vae": ["3", 0]}},
        "13": {"class_type": "SaveImage", "inputs": {"images": ["12", 0], "filename_prefix": prefix}},
    }
    for i, reference in enumerate(recipe["references"], 1):
        graph[str(20 + i)] = {"class_type": "LoadImage", "inputs": {"image": reference_name(reference["sha256"])}}
    return graph


def page_manifest(name, number, template_version, render_version, story, canon, sheets):
    """Everything a page recipe records about how it renders, built from its inputs alone: the story snapshot and
    its page entry, the canon, and the SHA-256 of each cast member's locked sheet (sheets, by lowercase name).

    `page` writes what this returns; `lock-page` and `selftest` rebuild it and compare every key, so re-locking a
    character, or editing the story or the page entry, fails the page locks drawn from what was there before.
    """
    page = story["pages"][number - 1]
    cast = [(member, character(canon, member)["appearance"]["species"]) for member in page["cast"]]
    template = PAGE_TEMPLATES[template_version]
    manifest = {"kind": "story-page", "story": name, "page": number,
                "story_sha256": story["source"]["content_sha256"], "season": story["season"], "entry": page,
                "cast": [{"name": member, "species": species} for member, species in cast],
                "template_version": template_version, "render_version": render_version, "template": template,
                "prompt": page_prompt(template, story, page, cast), "settings": PAGE_RENDERS[render_version],
                "models": [{"role": role, **MODELS[role]} for role in PAGE_ROLES],
                "references": [{"name": member.lower(), "sha256": sheets.get(member.lower())} for member, _ in cast],
                "seeds": list(SEEDS)}
    manifest["graph"] = page_graph(manifest, 0, f"storybook/{name}/{page_stem(number)}")
    return manifest


def sheet_digests(names):
    """{name: the SHA-256 of their locked sheet now, or None}: the references a page draws on."""
    locked = STORYBOOK / LOCKED
    return {name: sha256(locked / f"{name}.png") if (locked / f"{name}.png").is_file() else None for name in names}


def page_embedded_problems(png, manifest, seed, canon, stories):
    """Why png is not the page its recipe describes at this seed, from the story (stories: name -> a story that
    passes its check) and the cast's current locked sheets; an empty list when it is."""
    problems = allowlist_problems(manifest)
    name, number = manifest.get("story"), manifest.get("page")
    story = stories.get(name) if isinstance(name, str) else None
    if (story is None or type(number) is not int or not 1 <= number <= len(story["pages"])
            or manifest.get("template_version") not in PAGE_TEMPLATES
            or manifest.get("render_version") not in PAGE_RENDERS):
        return problems + ["its story, page, template_version or render_version is not one the tool knows"]
    cast = [member.lower() for member in story["pages"][number - 1]["cast"]]
    sheets = sheet_digests(cast)
    problems += [f"{member} has no locked sheet, and this page is drawn from it" for member in cast
                 if sheets[member] is None]
    expected = page_manifest(name, number, manifest["template_version"], manifest["render_version"], story, canon,
                             sheets)
    return problems + rebuild_problems(png, manifest, expected, seed, page_graph,
                                       "this page, its story and the cast's locked sheets")


def page_identity(manifest, name, stem):
    number = manifest.get("page")
    if manifest.get("story") == name and type(number) is int and page_stem(number) == stem:
        return []
    return [f"it is {manifest.get('story')!r} page {number!r}'s recipe under {name}/{stem}"]


@contextlib.contextmanager
def art_lock():
    """Commits into design-source happen one at a time. The lock is on the storybook folder itself, which
    always exists; design-source is made on first use, since git doesn't keep empty folders."""
    folder = os.open(STORYBOOK, os.O_RDONLY)
    try:
        fcntl.flock(folder, fcntl.LOCK_EX)
        yield
    finally:
        os.close(folder)


@contextlib.contextmanager
def staging(folder):
    """Files written to the yielded folder move into `folder` together, under the art lock, if the block ends
    without an exception; otherwise none of them do."""
    folder.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=folder, prefix=".staging-") as tmp:
        yield Path(tmp)
        with art_lock():
            for path in sorted(Path(tmp).iterdir()):
                os.replace(path, folder / path.name)


def api(server, path, payload=None, timeout=30):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(server + path, data=data,
                                     headers={"Content-Type": "application/json"} if data else {})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read()
        return json.loads(body) if body else {}


def render(server, graph, out, timeout=1800):
    pid = api(server, "/prompt", {"prompt": graph, "client_id": "story-recipe"}).get("prompt_id")
    if not pid:
        sys.exit("ComfyUI rejected the graph")
    start = time.time()
    while time.time() - start < timeout:
        entry = api(server, f"/history/{pid}", timeout=10).get(pid)
        if entry:
            if entry.get("status", {}).get("status_str") == "error":
                sys.exit(f"render failed: {json.dumps(entry['status'])[:600]}")
            item = next(i for o in entry["outputs"].values() for i in o.get("images", []))
            query = urllib.parse.urlencode({"filename": item["filename"], "subfolder": item.get("subfolder", ""),
                                            "type": "output"})
            with urllib.request.urlopen(f"{server}/view?{query}", timeout=60) as response:
                out.write_bytes(response.read())
            return
        time.sleep(2)
    sys.exit(f"timed out after {timeout}s")


def require_models(server, roles):
    """Every model must be one ComfyUI actually loads under the allowlisted name, or the render isn't the recipe."""
    for role in roles:
        node, field = LOADERS[role]
        options = api(server, f"/object_info/{node}")[node]["input"]["required"][field][0]
        if MODELS[role]["file"] not in options:
            sys.exit(f"ComfyUI can't see {MODELS[role]['file']} ({node}) -- check extra_model_paths.yaml")


def require_nodes(server, graph):
    """ComfyUI answers /object_info/<node> with {} for a node it doesn't have."""
    for node in sorted({n["class_type"] for n in graph.values()}):
        if node not in api(server, f"/object_info/{node}"):
            sys.exit(f"ComfyUI has no {node} node, which the page graph needs -- update ComfyUI (UnetLoaderGGUF "
                     f"comes from the ComfyUI-GGUF custom node)")


def upload(server, data, name):
    """Put data in ComfyUI's input folder as name, replacing what's there, and confirm ComfyUI kept the name."""
    boundary = os.urandom(16).hex()
    body = b"".join(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"\r\n\r\n{value}\r\n'.encode()
                    for field, value in (("overwrite", "true"), ("type", "input")))
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
             f"Content-Type: image/png\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(server + "/upload/image", data=body,
                                     headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(request, timeout=60) as response:
        stored = json.loads(response.read())
    if stored.get("name") != name or stored.get("subfolder", "") != "":
        sys.exit(f"ComfyUI stored the reference {name} as {stored.get('subfolder')!r}/{stored.get('name')!r}, so "
                 f"the graph would load something else; nothing was rendered")


def contact_sheet(tiles, out, tile=480, references=(), reference_tile=240):
    """The candidates side by side; for a page, the cast's locked sheets in a strip above them, so picking a seed
    is also a consistency read."""
    top = reference_tile + 30 if references else 0
    sheet = Image.new("RGB", (tile * len(tiles), top + tile + 30), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (label, data) in enumerate(references):
        sheet.paste(Image.open(io.BytesIO(data)).convert("RGB").resize((reference_tile, reference_tile)),
                    (i * reference_tile, 30))
        draw.text((i * reference_tile + 8, 8), f"{label} (locked sheet)", fill="black")
    for i, (label, path) in enumerate(tiles):
        sheet.paste(Image.open(path).convert("RGB").resize((tile, tile)), (i * tile, top + 30))
        draw.text((i * tile + 8, top + 8), label, fill="black")
    sheet.save(out)


def cmd_character(args):
    canon = load_canon()
    name = character(canon, args.name)["name"].lower()
    manifest = draft_manifest(name, TEMPLATE, RENDER, canon)
    require_models(args.server, SHEET_ROLES)
    drafts = real_folder(DRAFTS)
    with staging(drafts) as tmp:
        paths = []
        for seed in SEEDS:
            paths.append(tmp / f"{name}-candidate-{seed}.png")
            render(args.server, recipe_graph(manifest, seed, f"storybook/{name}-{seed}"), paths[-1])
            print(f"rendered seed {seed}")
        contact_sheet([(f"seed {s}", p) for s, p in zip(SEEDS, paths)], tmp / f"{name}-contact-sheet.png")
        manifest["comfyui_version"] = api(args.server, "/system_stats", timeout=10).get("system", {}).get(
            "comfyui_version")
        # The bytes ComfyUI returned, so `lock` can refuse a candidate edited afterwards.
        manifest["candidates"] = {path.name: sha256(path) for path in paths}
        (tmp / f"{name}-recipe.json").write_text(json.dumps(manifest, indent=1))
    print(f"wrote {name}'s candidates, contact sheet and recipe to {DRAFTS} -- pick a seed, then `lock {name}`")


def cmd_page(args):
    canon = load_canon()
    story = load_story(args.story)
    problems = story_problems(story, canon)
    if problems:
        sys.exit(f"{STORIES}/{args.story}.json can't be drawn from: " + "; ".join(problems))
    number = page_number(args.story, story, args.number)
    stem, cast = page_stem(number), [member.lower() for member in story["pages"][number - 1]["cast"]]
    drafts = real_folder(page_folder(args.story, "drafts"))
    with art_lock():
        # Each sheet is read once, under the lock, after its lock checks out: the bytes checked are the bytes
        # uploaded and recorded.
        broken = [(path, why) for path, why in locked_problems(canon)
                  if path == STORYBOOK / LOCKED or path.name.split(".")[0] in cast]
        if broken:
            sys.exit("the cast's locked sheets fail their checks (run `selftest`): "
                     + "; ".join(f"{path.name}: {why}" for path, why in broken))
        sheets = {}
        for member in cast:
            path = STORYBOOK / LOCKED / f"{member}.png"
            if not path.is_file():
                sys.exit(f"{member} has no locked sheet -- run `character {member}`, then `lock {member}`, first")
            sheets[member] = path.read_bytes()
    manifest = page_manifest(args.story, number, PAGE_TEMPLATE, PAGE_RENDER, story, canon,
                             {member: hashlib.sha256(data).hexdigest() for member, data in sheets.items()})
    require_nodes(args.server, manifest["graph"])
    require_models(args.server, PAGE_ROLES)
    for reference in manifest["references"]:
        upload(args.server, sheets[reference["name"]], reference_name(reference["sha256"]))
    with staging(drafts) as tmp:
        paths = []
        for seed in SEEDS:
            paths.append(tmp / f"{stem}-candidate-{seed}.png")
            started = time.time()
            render(args.server, page_graph(manifest, seed, f"storybook/{args.story}/{stem}-{seed}"), paths[-1])
            print(f"rendered seed {seed} in {time.time() - started:.0f}s")
        contact_sheet([(f"seed {s}", p) for s, p in zip(SEEDS, paths)], tmp / f"{stem}-contact-sheet.png",
                      references=[(member, sheets[member]) for member in cast])
        manifest["comfyui_version"] = api(args.server, "/system_stats", timeout=10).get("system", {}).get(
            "comfyui_version")
        manifest["candidates"] = {path.name: sha256(path) for path in paths}
        (tmp / f"{stem}-recipe.json").write_text(json.dumps(manifest, indent=1))
    print(f"wrote page {number}'s candidates, contact sheet and recipe to {page_folder(args.story, 'drafts')} -- "
          f"pick a seed, then `lock-page {args.story} {number}`")


def commit_lock(drafts_rel, locked_rel, stem, seed, force, command, check):
    """Lock the draft candidate at seed as locked_rel/<stem>.png with its recipe, once check(staged png, recipe)
    finds nothing wrong with the staged copy. command is what renders the drafts, for the messages."""
    drafts, locked = real_folder(drafts_rel), real_folder(locked_rel)
    with art_lock():
        # The draft set is read under the lock, so the recipe and the candidate come from one committed set.
        draft_recipe = drafts / f"{stem}-recipe.json"
        if not draft_recipe.is_file():
            sys.exit(f"{drafts_rel}/{draft_recipe.name} is missing -- run `{command}` first")
        manifest = json.loads(draft_recipe.read_text())
        if seed not in manifest.get("seeds", []):
            sys.exit(f"seed {seed} is not one of the rendered candidates {manifest.get('seeds')}")
        candidate = drafts / f"{stem}-candidate-{seed}.png"
        if not candidate.is_file():
            sys.exit(f"{drafts_rel}/{candidate.name} is missing -- run `{command}` again")
        targets = [locked / f"{stem}.png", locked / f"{stem}.recipe.json"]
        if any(os.path.lexists(t) for t in targets) and not force:
            sys.exit(f"{stem} is already locked (use --force to replace it)")
        if any(t.is_symlink() for t in targets):
            sys.exit(f"{stem}'s lock is a symlink; a lock writes only real files")
        manifest.update(chosen_seed=seed, source=f"{drafts_rel}/{candidate.name}")
        locked.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=locked, prefix=".staging-") as tmp:
            # The candidate is read once, into staging, and the staged copy is what gets validated and committed.
            staged = Path(tmp) / f"{stem}.png"
            staged.write_bytes(candidate.read_bytes())
            rendered = manifest.get("candidates", {}).get(candidate.name) if isinstance(manifest.get("candidates"),
                                                                                         dict) else None
            if rendered is None or sha256(staged) != rendered:
                sys.exit(f"{candidate.name} is not the bytes `{command.split()[0]}` rendered (edited since, or a "
                         f"draft from before candidates were recorded) -- re-run `{command}`")
            problems = check(staged, manifest)
            if problems:
                sys.exit(f"{candidate.name} is not the render its recipe describes: " + "; ".join(problems))
            manifest["files"] = {staged.name: sha256(staged)}
            (Path(tmp) / f"{stem}.recipe.json").write_text(json.dumps(manifest, indent=1))
            for path in sorted(Path(tmp).iterdir()):
                os.replace(path, locked / path.name)
    print(f"locked {locked_rel}/{stem}.png + .recipe.json")


def cmd_lock(args):
    canon = load_canon()
    name = character(canon, args.name)["name"].lower()
    commit_lock(DRAFTS, LOCKED, name, args.seed, args.force, f"character {name}",
                lambda staged, manifest: embedded_problems(staged, manifest, args.seed, canon))


def cmd_lock_page(args):
    canon = load_canon()
    story = load_story(args.story)
    problems = story_problems(story, canon)
    if problems:
        sys.exit(f"{STORIES}/{args.story}.json can't be drawn from: " + "; ".join(problems))
    number = page_number(args.story, story, args.number)
    stem = page_stem(number)
    commit_lock(page_folder(args.story, "drafts"), page_folder(args.story, "locked"), stem, args.seed, args.force,
                f"page {args.story} {number}",
                lambda staged, manifest: page_identity(manifest, args.story, stem) + page_embedded_problems(
                    staged, manifest, args.seed, canon, {args.story: story}))


def lock_folder_problems(folder, kind, recipe_problems):
    """[(path, why)] for everything wrong in a locked folder: entries that aren't regular files, files that aren't
    exactly one recipe's or no longer have their locked bytes, and whatever recipe_problems(recipe, manifest, png)
    finds wrong with a lock of this kind."""
    problems, owners = [], {}
    if folder.resolve() != folder:
        return [(folder, f"goes through a symlink to {folder.resolve()}; locks live only in the storybook")]
    if not folder.is_dir():
        return problems
    entries = sorted(folder.iterdir())
    for entry in entries:
        if entry.is_symlink() or not entry.is_file():
            problems.append((entry, "is not a regular file; the locked folder holds only files with a record"))
    for recipe in (e for e in entries if e.name.endswith(".recipe.json") and e.is_file() and not e.is_symlink()):
        owners.setdefault(recipe, []).append(recipe)
        manifest = json.loads(recipe.read_text())
        files = manifest.get("files") if isinstance(manifest.get("files"), dict) else {}
        png = folder / f"{recipe.name.removesuffix('.recipe.json')}.png"
        if set(files) != {png.name}:
            problems.append((recipe, f"it records files {sorted(files)}; a {kind} lock owns {png.name}"))
        for file_name, digest in files.items():
            owners.setdefault(folder / file_name, []).append(recipe)
            if (folder / file_name).is_file() and sha256(folder / file_name) != digest:
                problems.append((recipe, f"{file_name} has changed since it was locked (sha256 differs)"))
        if manifest.get("chosen_seed") not in SEEDS:
            problems.append((recipe, f"its chosen_seed {manifest.get('chosen_seed')!r} is not one of the rendered seeds"))
        if not png.is_file():
            problems.append((recipe, f"{png.name} is not on disk"))
        problems += [(recipe, why) for why in recipe_problems(recipe, manifest, png)]
    for entry in entries:
        claims = owners.get(entry, [])
        if entry.is_file() and not entry.is_symlink() and len(claims) != 1:
            problems.append((entry, "no recipe owns it" if not claims else "more than one recipe claims it"))
    return problems


def locked_problems(canon):
    """[(path, why)] for everything wrong with the character locks."""
    def character_lock(recipe, manifest, png):
        whys = []
        if manifest.get("name") != recipe.name.removesuffix(".recipe.json"):
            whys.append(f"it is {manifest.get('name')!r}'s recipe under another character's name")
        if png.is_file():
            whys += embedded_problems(png, manifest, manifest.get("chosen_seed"), canon)
            if manifest.get("source") != f"{DRAFTS}/{manifest.get('name')}-candidate-{manifest.get('chosen_seed')}.png":
                whys.append("its recorded source is not the draft lock copies for it")
        return whys
    return lock_folder_problems(STORYBOOK / LOCKED, "character", character_lock)


def story_and_page_problems(canon):
    """([(path, why)], stories checked) for every story's snapshot and plan, and every page lock."""
    problems, sound, folder = [], {}, STORYBOOK / STORIES
    story_files = sorted(folder.glob("*.json")) if folder.is_dir() else []
    for path in story_files:
        try:
            story = json.loads(path.read_text())
        except ValueError as error:
            problems.append((path, f"is not JSON ({error})"))
            continue
        whys = (story_problems(story, canon) if STORY_NAME.fullmatch(path.stem)
                else [f"{path.stem!r} is not a story name (lowercase words joined by hyphens)"])
        problems += [(path, why) for why in whys]
        if not whys:
            sound[path.stem] = story
    pages = STORYBOOK / PAGES
    for story_folder in sorted(pages.iterdir()) if pages.is_dir() else []:
        name, locked = story_folder.name, story_folder / "locked"
        if name not in sound:
            if os.path.lexists(locked):
                problems.append((locked, f"holds page locks for {name!r}, which has no story in {STORIES}/ that "
                                         f"passes its check"))
            continue

        def page_lock(recipe, manifest, png, name=name):
            stem = recipe.name.removesuffix(".recipe.json")
            whys = page_identity(manifest, name, stem)
            if png.is_file():
                whys += page_embedded_problems(png, manifest, manifest.get("chosen_seed"), canon, sound)
                drafted = f"{page_folder(name, 'drafts')}/{stem}-candidate-{manifest.get('chosen_seed')}.png"
                if manifest.get("source") != drafted:
                    whys.append("its recorded source is not the draft lock copies for it")
            return whys
        problems += lock_folder_problems(locked, "page", page_lock)
    return problems, len(story_files)


def cmd_selftest(args):
    canon = load_canon()
    with art_lock():
        problems = locked_problems(canon)
        story_problems_found, stories = story_and_page_problems(canon)
    problems += story_problems_found
    for path, why in problems:
        print(f"FAIL {path.relative_to(STORYBOOK)}: {why}")
    locks = sorted((STORYBOOK / LOCKED).glob("*.recipe.json")) if (STORYBOOK / LOCKED).is_dir() else []
    page_locks = sorted((STORYBOOK / PAGES).glob("*/locked/*.recipe.json")) if (STORYBOOK / PAGES).is_dir() else []
    print(f"{len(locks)} character locks, {stories} stories and {len(page_locks)} page locks checked against "
          f"{CANON}; {len(problems)} problems")
    sys.exit(1 if problems else 0)


def main():
    global STORYBOOK
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--storybook", type=Path, default=STORYBOOK, help="storybook root (the tests use a copy)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("character").add_argument("name")
    lk = sub.add_parser("lock")
    lk.add_argument("name")
    lk.add_argument("--seed", type=int, required=True)
    lk.add_argument("--force", action="store_true")
    pg = sub.add_parser("page")
    pg.add_argument("story")
    pg.add_argument("number", type=int)
    lp = sub.add_parser("lock-page")
    lp.add_argument("story")
    lp.add_argument("number", type=int)
    lp.add_argument("--seed", type=int, required=True)
    lp.add_argument("--force", action="store_true")
    sub.add_parser("selftest")
    args = ap.parse_args()
    STORYBOOK = args.storybook.resolve()
    args.server = args.server.rstrip("/")
    try:
        {"character": cmd_character, "lock": cmd_lock, "page": cmd_page, "lock-page": cmd_lock_page,
         "selftest": cmd_selftest}[args.cmd](args)
    except urllib.error.URLError as error:
        sys.exit(f"ComfyUI at {args.server} is unreachable ({error.reason}); nothing was written")


if __name__ == "__main__":
    main()
