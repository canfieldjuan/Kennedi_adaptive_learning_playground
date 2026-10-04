#!/usr/bin/env python3
"""Reproduce every reported way illustration-recipe.py could damage or mis-describe locked art.

Each case runs the real command line against a copy of the workbook (--workbook), so nothing here can
touch the real art, and nothing is stubbed out except the vectorizer in the one case that needs it to
fail. No ComfyUI and no GPU: every case is refused, or finishes, before a render would start.

  python3 workbook/tools/test-illustration-recipe.py
"""
import fcntl
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image
from PIL.PngImagePlugin import PngInfo

WORKBOOK = Path(__file__).resolve().parents[1]
TOOL = WORKBOOK / "tools/illustration-recipe.py"
LOCKED = "design-source/animals/locked-poses"
DRAFTS = "design-source/animals/drafts"
BASELINE = "design-source/legacy-locked-assets.json"
NEUTRAL = "boss-kennedi/locked-poses/01-neutral.png"     # legacy, rebuilt by a documented process
DOG = "animals/locked-poses/dog-01-sitting.png"          # legacy, rebuilt by `reproduce`
HOUSE = "objects/locked/house.png"
results = []


def check(label, ok, detail=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f": {str(detail)[:160]}" if detail else ""))


def workbook_copy(root):
    """A workbook holding one line-art lock, its color lock, their drafts, three legacy assets and the tools."""
    for sub in (LOCKED, DRAFTS, "design-source/objects/locked", "design-source/objects/drafts",
                "design-source/boss-kennedi/locked-poses", "tools", "docs/art"):
        (root / sub).mkdir(parents=True)
    for tool in ("vectorize-line-art.sh", "comfy-generate.py"):
        shutil.copy(WORKBOOK / "tools" / tool, root / "tools")
    for f in (WORKBOOK / LOCKED).glob("bunny-01-sitting*"):
        shutil.copy(f, root / LOCKED)
    for f in (WORKBOOK / DRAFTS).glob("bunny-*"):
        shutil.copy(f, root / DRAFTS)
    # selftest checks the two templates against the dog and the house, locked before recipes existed. The
    # legacy entries come from the real baseline, so their recorded bytes are the real ones.
    real = json.loads((WORKBOOK / BASELINE).read_text())
    baseline = {key: real[key] for key in (NEUTRAL, DOG, HOUSE)}
    for key, entry in baseline.items():
        for name in entry["files"]:
            shutil.copy(WORKBOOK / "design-source" / key.rsplit("/", 1)[0] / name,
                        root / "design-source" / key.rsplit("/", 1)[0])
    shutil.copy(WORKBOOK / "docs/art/asset-provenance.md", root / "docs/art")
    (root / BASELINE).write_text(json.dumps(baseline))
    return root


def run(root, *args):
    done = subprocess.run([sys.executable, "-B", str(TOOL), "--workbook", str(root), *map(str, args)],
                          capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def state(root):
    return {p.name: p.read_bytes() for p in (root / LOCKED).iterdir() if p.is_file()}


def line(out, start):
    """The selftest line about one file, so a check can't pass on a message about another."""
    return next((text for text in out.splitlines() if text.startswith(start)), "")


def text_node(graph):
    return next(n["inputs"] for n in graph.values() if n["class_type"] == "CLIPTextEncode" and n["inputs"]["text"])


def reprompt(png, prompt):
    """Rewrite a candidate's embedded prompt, the way an edited recipe would have rendered it."""
    image = Image.open(png)
    graph = json.loads(image.info["prompt"])
    text_node(graph)["text"] = prompt
    meta = PngInfo()
    meta.add_text("prompt", json.dumps(graph))
    image.save(png, pnginfo=meta)


def drop_color_lock(root):
    """Remove the color lock, so a case about line art is not refused by the dependency rule first."""
    for f in (root / LOCKED).glob("bunny-01-sitting-color*"):
        f.unlink()


def case_names_that_build_paths(root):
    """A name is a file name, so a path in one must not send the write somewhere else."""
    outside = root.parent / "outside.png"
    outside.write_bytes(b"not part of the workbook")
    before = state(root)
    for name in (str(outside.with_suffix("")), "../escape", "Bad_Name", "with space", ".hidden"):
        code, out = run(root, "lock", "animal", "bunny", "--seed", "72", "--force", "--locked-name", name)
        check(f"lock --locked-name {name!r} is refused", code and "must be lowercase" in out, out.strip())
    check("the file outside the workbook is untouched", outside.read_bytes() == b"not part of the workbook")
    check("the lock folder is unchanged", state(root) == before)
    code, out = run(root, "candidates", "animal", "../evil", "--pose", "sitting", "--shading", "x", "--accent", "y")
    check("candidates with a path in the name is refused", code and "must be lowercase" in out, out.strip())


def case_pose_punctuation(root):
    """The lock name takes a word from the pose, which is free text."""
    recipe = root / DRAFTS / "bunny-recipe.json"
    manifest = json.loads(recipe.read_text())
    manifest["fields"]["pose"] = "sitting, large and filling most of the frame"
    manifest["prompt"] = manifest["template"].format(**manifest["fields"])
    text_node(manifest["graph"])["text"] = manifest["prompt"]
    recipe.write_text(json.dumps(manifest))
    reprompt(root / DRAFTS / "bunny-candidate-72.png", manifest["prompt"])
    drop_color_lock(root)
    code, out = run(root, "lock", "animal", "bunny", "--seed", "72", "--force")
    names = sorted(p.name for p in (root / LOCKED).glob("bunny-01-*"))
    check("a pose with punctuation still locks a clean file name",
          not code and "bunny-01-sitting.png" in names and not any("," in n for n in names), f"{out.strip()} {names}")


def case_dependent_color_lock(root):
    """A color lock's guide is rebuilt from its line art, so replacing that line art would break it."""
    code, out = run(root, "lock", "animal", "bunny", "--seed", "61", "--force")
    check("replacing line art a color lock depends on is refused",
          code and "is the source of" in out and "bunny-01-sitting-color.recipe.json" in out, out.strip())


def case_lock_replaces_only_its_own_lock(root):
    """A lock may replace the lock of its own kind at its name, and no other file in a locked folder."""
    before = state(root)
    for args, what in [
        (["--seed", "72", "--color", "--locked-name", "bunny-01-sitting"], "a color lock over the line-art lock"),
        (["--seed", "61", "--locked-name", "bunny-01-sitting-color"], "a line-art lock over the color lock"),
        (["--seed", "61", "--locked-name", "bunny-01-sitting-color-guide"], "a line-art lock over a color guide"),
        (["--seed", "61", "--locked-name", "dog-01-sitting"], "a line-art lock over legacy art"),
        (["--seed", "72", "--color", "--locked-name", "dog-01-sitting"], "a color lock over legacy art"),
    ]:
        code, out = run(root, "lock", "animal", "bunny", *args, "--force")
        check(f"{what} is refused, even with --force", code and "belongs to" in out, out.strip())
    check("those refusals changed nothing", state(root) == before)
    code, out = run(root, "lock", "animal", "bunny", "--seed", "72", "--color", "--force")
    check("a color lock still replaces the color lock at its own name", not code, out.strip())
    code, out = run(root, "selftest")
    check("and the replacement checks out", not code, out.strip()[-200:])


def case_failed_vectorizer(root):
    """A step failing part-way must leave the approved lock exactly as it was."""
    drop_color_lock(root)
    (root / "tools/vectorize-line-art.sh").write_text("#!/bin/sh\nexit 1\n")
    before = state(root)
    code, out = run(root, "lock", "animal", "bunny", "--seed", "61", "--force")
    leftovers = [p.name for p in (root / LOCKED).iterdir() if p.name.startswith(".staging-")]
    check("a failing vectorizer leaves the lock set byte-identical", code and state(root) == before, out.strip()[-160:])
    check("a failing vectorizer leaves no staging folder", not leftovers, leftovers)
    shutil.copy(WORKBOOK / "tools/vectorize-line-art.sh", root / "tools")


def case_candidate_is_not_its_recipe(root):
    """An interrupted rerun can leave another seed's render under the name the recipe describes."""
    drop_color_lock(root)
    shutil.copy(root / DRAFTS / "bunny-candidate-83.png", root / DRAFTS / "bunny-candidate-61.png")
    before = state(root)
    code, out = run(root, "lock", "animal", "bunny", "--seed", "61", "--force")
    check("locking a candidate that is not its recipe's render is refused",
          code and "is not the render its recipe describes" in out, out.strip())
    check("that refusal changed nothing", state(root) == before)


def case_swapped_svg(root):
    """Print uses the SVG, so it must be the one its lock wrote, not merely a file with its name."""
    shutil.copy(WORKBOOK / LOCKED / "bear-01-sitting.svg", root / LOCKED / "bunny-01-sitting.svg")
    code, out = run(root, "selftest")
    check("a lock whose SVG is another character's fails selftest",
          code and "bunny-01-sitting.svg has changed since it was recorded"
          in line(out, "FAIL recipe   animals/locked-poses/bunny-01-sitting.recipe.json"), out.strip()[-200:])


def case_recorded_render_settings(root):
    """Every value a recipe records must be the one its render used, or one the tool adds."""
    for name, key, value, expect in [
        ("bunny-01-sitting", "size", 512, "recorded size"), ("bunny-01-sitting", "steps", 20, "recorded steps"),
        ("bunny-01-sitting-color", "strength", 0.5, "recorded strength"),
        ("bunny-01-sitting-color", "end_percent", 0.9, "recorded end_percent"),
        ("bunny-01-sitting-color", "controlnet", "another-controlnet.safetensors", "recorded controlnet"),
        ("bunny-01-sitting", "guidance", 2.0, "records guidance, which the tool does not"),
        # The bunny's guide is v1's blurred one; v2 would rebuild it unblurred, so its pixels can't match.
        ("bunny-01-sitting-color", "recipe_version", "v2", "recipe v2 no longer rebuilds its guide"),
    ]:
        recipe = root / LOCKED / f"{name}.recipe.json"
        original = recipe.read_text()
        manifest = json.loads(original)
        manifest[key] = value
        recipe.write_text(json.dumps(manifest))
        code, out = run(root, "selftest")
        check(f"{name} recording {key}={value} fails selftest",
              code and expect in line(out, f"FAIL recipe   animals/locked-poses/{name}.recipe.json"),
              out.strip()[-200:])
        recipe.write_text(original)
    recipe = root / LOCKED / "bunny-01-sitting-color.recipe.json"
    original = recipe.read_text()
    manifest = json.loads(original)
    del manifest["source_line_art"]
    recipe.write_text(json.dumps(manifest))
    code, out = run(root, "selftest")
    check("a color recipe that stops recording its source line art fails selftest",
          code and "does not record source_line_art"
          in line(out, "FAIL recipe   animals/locked-poses/bunny-01-sitting-color.recipe.json"), out.strip()[-200:])
    recipe.write_text(original)
    code, out = run(root, "selftest")
    check("restored, every recipe passes again", not code, out.strip()[-200:])


def case_legacy_records(root):
    """Art the tool didn't render is checked against the bytes and the rebuild route recorded for it."""
    baseline_path = root / BASELINE
    original = baseline_path.read_text()
    neutral = root / "design-source" / NEUTRAL
    kept = neutral.read_bytes()
    image = Image.open(neutral).convert("RGB")
    image.putpixel((0, 0), (1, 2, 3))
    image.save(neutral)
    code, out = run(root, "selftest")
    check("rewritten legacy art fails selftest",
          code and "01-neutral.png has changed since it was recorded" in line(out, f"FAIL legacy   {NEUTRAL}"),
          out.strip()[-200:])
    neutral.write_bytes(kept)

    outside = root.parent / "outside-record.md"
    outside.write_text("not part of the workbook")
    for change, label, expect in [
        (lambda e: e[NEUTRAL].update(rebuild="reproduce") or e[NEUTRAL].pop("record"),
         "graphless art recorded as rebuilt by reproduce", "reproduce refuses it: it has no embedded graph"),
        (lambda e: e[NEUTRAL].update(record="docs/art/no-such-record.md"),
         "a documented rebuild whose record is missing", "is not a file in the workbook"),
        (lambda e: e[NEUTRAL].update(record="../outside-record.md"),
         "a documented rebuild whose record is outside the workbook", "is not a file in the workbook"),
        (lambda e: e[NEUTRAL].update(rebuild="by hand"),
         "a rebuild route the tool doesn't know", "must be 'reproduce' or 'documented'"),
        (lambda e: e[DOG].update(rebuild="reproduce", record="docs/art/asset-provenance.md"),
         "a record on a reproduce entry", "record applies only to rebuild: documented"),
    ]:
        entries = json.loads(original)
        change(entries)
        baseline_path.write_text(json.dumps(entries))
        code, out = run(root, "selftest")
        check(f"{label} fails selftest", code and expect in out, out.strip()[-200:])
        baseline_path.write_text(original)

    entries = json.loads(original)
    entries[DOG]["files"]["bunny-01-sitting.png"] = entries[DOG]["files"]["dog-01-sitting.png"]
    baseline_path.write_text(json.dumps(entries))
    code, out = run(root, "selftest")
    check("a file claimed by a lock and a legacy entry fails selftest",
          code and "claimed by" in line(out, "FAIL locked   animals/locked-poses/bunny-01-sitting.png"),
          out.strip()[-200:])
    baseline_path.write_text(json.dumps(list(json.loads(original))))
    code, out = run(root, "selftest")
    check("a baseline in the old list form fails selftest", code and "not an object keyed by PNG path" in out,
          out.strip()[-200:])
    baseline_path.write_text(original)

    (root / LOCKED / "stray.svg").write_text("<svg/>")
    code, out = run(root, "selftest")
    check("a file no recipe or legacy entry owns fails selftest",
          code and "no recipe or legacy entry owns it" in line(out, "FAIL locked   animals/locked-poses/stray.svg"),
          out.strip()[-200:])
    (root / LOCKED / "stray.svg").unlink()
    code, out = run(root, "selftest")
    check("restored, selftest passes again", not code, out.strip()[-200:])


def case_lock_is_serialized(root):
    """Two locks must not interleave their renames, so a lock waits while another holds locked art."""
    folder = os.open(root / "design-source", os.O_RDONLY)
    fcntl.flock(folder, fcntl.LOCK_EX)
    lock = subprocess.Popen([sys.executable, "-B", str(TOOL), "--workbook", str(root), "lock", "animal", "bunny",
                             "--seed", "72", "--color", "--force"],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(3)
    check("lock waits while another process holds locked art", lock.poll() is None)
    fcntl.flock(folder, fcntl.LOCK_UN)
    os.close(folder)
    out, _ = lock.communicate(timeout=120)
    check("and completes once that process lets go", lock.returncode == 0, out.strip()[-160:])


def case_draft_swapped_mid_validation(root):
    """lock must commit the bytes it validated, even if the draft is replaced while it validates."""
    drop_color_lock(root)
    # The validator calls build_graph twice: rebuilding the recipe, then the graph to compare after reading the
    # PNG. The second call swaps another seed's render into the draft, as a concurrent `candidates` run would,
    # landing between the validator's read and anything read later.
    with open(root / "tools/comfy-generate.py", "a") as module:
        module.write(
            "\n_build_graph = build_graph\n\n\n"
            "def build_graph(*args):\n"
            "    marker = os.path.join(os.path.dirname(__file__), 'swapped')\n"
            "    calls = os.path.join(os.path.dirname(__file__), 'build-graph-calls')\n"
            "    count = (os.path.getsize(calls) if os.path.exists(calls) else 0) + 1\n"
            "    with open(calls, 'a') as tally:\n"
            "        tally.write('.')\n"
            "    if count == 2 and not os.path.exists(marker):\n"
            "        open(marker, 'w').close()\n"
            "        drafts = os.path.join(os.path.dirname(__file__), '..', 'design-source', 'animals', 'drafts')\n"
            "        with open(os.path.join(drafts, 'bunny-candidate-83.png'), 'rb') as other:\n"
            "            swapped = other.read()\n"
            "        with open(os.path.join(drafts, 'bunny-candidate-61.png'), 'wb') as candidate:\n"
            "            candidate.write(swapped)\n"
            "    return _build_graph(*args)\n")
    before = state(root)
    code, out = run(root, "lock", "animal", "bunny", "--seed", "61", "--force")
    check("the injected swap happened during the lock", (root / "tools/swapped").exists())
    if code:
        check("a lock refused mid-swap changed nothing", state(root) == before, out.strip()[-160:])
    else:
        scode, sout = run(root, "selftest")
        check("a lock that succeeds mid-swap still checks out", not scode, sout.strip()[-200:])


def case_locked_folders_hold_only_files(root):
    """Every name in a locked folder needs its own record: no nested folders, no symlink aliases."""
    nested = root / LOCKED / "untracked"
    nested.mkdir()
    shutil.copy(root / LOCKED / "bunny-01-sitting.png", nested / "rogue.png")
    code, out = run(root, "selftest")
    check("a folder inside a locked folder fails selftest",
          code and "is a folder" in line(out, "FAIL locked   animals/locked-poses/untracked"), out.strip()[-200:])
    check("and the file inside it needs an owner",
          "no recipe or legacy entry owns it" in line(out, "FAIL locked   animals/locked-poses/untracked/rogue.png"))
    shutil.rmtree(nested)
    (root / LOCKED / "alias.png").symlink_to("bunny-01-sitting.png")
    code, out = run(root, "selftest")
    check("a symlink alias in a locked folder fails selftest",
          code and "is a symlink" in line(out, "FAIL locked   animals/locked-poses/alias.png"), out.strip()[-200:])
    (root / LOCKED / "alias.png").unlink()
    code, out = run(root, "selftest")
    check("removed, selftest passes again", not code, out.strip()[-200:])


def case_color_source_is_a_managed_lock(root):
    """A color asset's guide is rebuilt from its source, so the source must be a line-art lock the tool owns."""
    scratch = root / "design-source/scratch"
    scratch.mkdir()
    for name in ("bunny-01-sitting.png", "bunny-01-sitting.recipe.json"):
        shutil.copy(root / LOCKED / name, scratch)
    code, out = run(root, "--server", "http://127.0.0.1:9", "colorize", scratch / "bunny-01-sitting.png",
                    "--colors", "soft white fur")
    check("colorize from a copy outside the locked folder is refused before rendering",
          code and "is not a PNG in design-source/animals/locked-poses" in out, out.strip()[-200:])
    code, out = run(root, "--server", "http://127.0.0.1:9", "colorize", root / LOCKED / "bunny-01-sitting.png",
                    "--colors", "soft white fur")
    check("colorize from the managed lock gets past that check (then finds no ComfyUI)",
          code and "is not a PNG in" not in out and "line-art lock" not in out, out.strip()[-200:])
    recipe = root / LOCKED / "bunny-01-sitting-color.recipe.json"
    manifest = json.loads(recipe.read_text())
    manifest["source_line_art"] = "design-source/scratch/bunny-01-sitting.png"
    recipe.write_text(json.dumps(manifest))
    code, out = run(root, "selftest")
    check("a color lock whose source is the scratch copy fails selftest",
          code and "is not a PNG in design-source/animals/locked-poses"
          in line(out, "FAIL recipe   animals/locked-poses/bunny-01-sitting-color.recipe.json"), out.strip()[-200:])


def case_reproduce_outputs(root):
    """reproduce must not write into a locked folder, over its source, or without the guide it needs."""
    source = root / LOCKED / "bunny-01-sitting.png"
    code, out = run(root, "reproduce", str(source), "--out", str(source))
    check("reproduce --out onto its source is refused", code and "locked folder" in out, out.strip())
    code, out = run(root, "reproduce", str(source), "--out", str(root / LOCKED / "elsewhere.png"))
    check("reproduce --out into a locked folder is refused", code and "locked folder" in out, out.strip())
    loose = root.parent / "loose"
    loose.mkdir(exist_ok=True)
    shutil.copy(root / LOCKED / "bunny-01-sitting-color.png", loose / "orphan.png")
    code, out = run(root, "reproduce", str(loose / "orphan.png"), "--out", str(loose / "out.png"))
    check("reproduce of a guided PNG with no recipe is refused", code and "names it" in out, out.strip())
    copy = loose / "copy.png"
    shutil.copy(source, copy)
    (loose / "alias.png").symlink_to(copy)
    code, out = run(root, "reproduce", str(copy), "--out", str(loose / "alias.png"))
    check("reproduce --out onto a symlink to its source is refused", code and "is an input" in out, out.strip())
    code, out = run(root, "reproduce", root / "design-source" / NEUTRAL, "--out", loose / "neutral.png")
    check("reproduce of a PNG with no embedded graph exits with the reason",
          code and "no embedded graph" in out and "Traceback" not in out, out.strip()[-200:])


def case_selftest_accounts_for_everything(root):
    """Every file in a locked folder is described, or selftest says which one is not."""
    code, out = run(root, "selftest")
    check("selftest passes on an untouched copy", not code, out.strip()[-160:])
    (root / LOCKED / "bunny-01-sitting-color.recipe.json").rename(root / "kept.json")
    code, out = run(root, "selftest")
    check("a lock whose recipe is deleted fails selftest",
          code and "was its recipe deleted?" in line(out, "FAIL locked   animals/locked-poses/bunny-01-sitting-color.png"),
          out.strip()[-200:])
    (root / "kept.json").rename(root / LOCKED / "bunny-01-sitting-color.recipe.json")
    (root / "design-source" / NEUTRAL).unlink()
    code, out = run(root, "selftest")
    check("a legacy asset that is gone fails selftest", code and "not on disk" in out, out.strip()[-200:])
    shutil.copy(WORKBOOK / "design-source" / NEUTRAL, root / "design-source" / NEUTRAL)
    recipe = root / LOCKED / "bunny-01-sitting.recipe.json"
    manifest = json.loads(recipe.read_text())
    manifest["prompt"] = manifest["prompt"].replace("bunny sitting", "bunny standing")
    recipe.write_text(json.dumps(manifest))
    code, out = run(root, "selftest")
    check("an edited recorded prompt fails selftest", code and "recorded prompt" in out, out.strip()[-200:])


def main():
    cases = [case_names_that_build_paths, case_pose_punctuation, case_dependent_color_lock,
             case_lock_replaces_only_its_own_lock, case_failed_vectorizer, case_candidate_is_not_its_recipe,
             case_swapped_svg, case_recorded_render_settings, case_legacy_records, case_lock_is_serialized,
             case_draft_swapped_mid_validation, case_locked_folders_hold_only_files,
             case_color_source_is_a_managed_lock, case_reproduce_outputs, case_selftest_accounts_for_everything]
    for case in cases:
        print(f"\n== {case.__name__}: {case.__doc__}")
        with tempfile.TemporaryDirectory(prefix="recipe-test-") as tmp:
            case(workbook_copy(Path(tmp) / "workbook"))
    print(f"\n{sum(results)} of {len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
