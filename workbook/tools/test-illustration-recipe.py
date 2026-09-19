#!/usr/bin/env python3
"""Reproduce every reported way illustration-recipe.py could damage or mis-describe locked art.

Each case runs the real command line against a copy of the workbook (--workbook), so nothing here can
touch the real art, and nothing is stubbed out except the vectorizer in the one case that needs it to
fail. No ComfyUI and no GPU: every case is refused, or finishes, before a render would start.

  python3 workbook/tools/test-illustration-recipe.py
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image
from PIL.PngImagePlugin import PngInfo

WORKBOOK = Path(__file__).resolve().parents[1]
TOOL = WORKBOOK / "tools/illustration-recipe.py"
LOCKED = "design-source/animals/locked-poses"
DRAFTS = "design-source/animals/drafts"
results = []


def check(label, ok, detail=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f": {str(detail)[:160]}" if detail else ""))


def workbook_copy(root):
    """A workbook holding one line-art lock, its color lock, their drafts and the tools the commands use."""
    for sub in (LOCKED, DRAFTS, "design-source/objects/locked", "design-source/objects/drafts",
                "design-source/boss-kennedi/locked-poses", "tools"):
        (root / sub).mkdir(parents=True)
    for tool in ("vectorize-line-art.sh", "comfy-generate.py"):
        shutil.copy(WORKBOOK / "tools" / tool, root / "tools")
    for f in (WORKBOOK / LOCKED).glob("bunny-01-sitting*"):
        shutil.copy(f, root / LOCKED)
    for f in (WORKBOOK / DRAFTS).glob("bunny-*"):
        shutil.copy(f, root / DRAFTS)
    shutil.copy(WORKBOOK / "design-source/boss-kennedi/locked-poses/01-neutral.png",
                root / "design-source/boss-kennedi/locked-poses")
    # selftest checks the two templates against the dog and the house, locked before recipes existed.
    shutil.copy(WORKBOOK / f"{LOCKED}/dog-01-sitting.png", root / LOCKED)
    shutil.copy(WORKBOOK / "design-source/objects/locked/house.png", root / "design-source/objects/locked")
    (root / "design-source/legacy-locked-assets.json").write_text(json.dumps(
        ["boss-kennedi/locked-poses/01-neutral.png", "animals/locked-poses/dog-01-sitting.png",
         "objects/locked/house.png"]))
    return root


def run(root, *args):
    done = subprocess.run([sys.executable, str(TOOL), "--workbook", str(root), *map(str, args)],
                          capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def state(root):
    return {p.name: p.read_bytes() for p in (root / LOCKED).iterdir() if p.is_file()}


def reprompt(png, prompt):
    """Rewrite a candidate's embedded prompt, the way an edited recipe would have rendered it."""
    image = Image.open(png)
    graph = json.loads(image.info["prompt"])
    node = next(n for n in graph.values() if n["class_type"] == "CLIPTextEncode" and n["inputs"]["text"])
    node["inputs"]["text"] = prompt
    meta = PngInfo()
    meta.add_text("prompt", json.dumps(graph))
    image.save(png, pnginfo=meta)


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


def drop_color_lock(root):
    """Remove the color lock, so a case about line art is not refused by the dependency rule first."""
    for f in (root / LOCKED).glob("bunny-01-sitting-color*"):
        f.unlink()


def case_pose_punctuation(root):
    """The lock name takes a word from the pose, which is free text."""
    recipe = root / DRAFTS / "bunny-recipe.json"
    manifest = json.loads(recipe.read_text())
    manifest["fields"]["pose"] = "sitting, large and filling most of the frame"
    manifest["prompt"] = manifest["template"].format(**manifest["fields"])
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


def case_selftest_accounts_for_everything(root):
    """Every file in a locked folder is described, or selftest says which one is not."""
    code, out = run(root, "selftest")
    check("selftest passes on an untouched copy", not code, out.strip()[-160:])
    (root / LOCKED / "bunny-01-sitting-color.recipe.json").rename(root / "kept.json")
    code, out = run(root, "selftest")
    check("a lock whose recipe is deleted fails selftest",
          code and "bunny-01-sitting-color.png" in out and "was its recipe deleted?" in out, out.strip()[-200:])
    (root / "kept.json").rename(root / LOCKED / "bunny-01-sitting-color.recipe.json")
    (root / "design-source/boss-kennedi/locked-poses/01-neutral.png").unlink()
    code, out = run(root, "selftest")
    check("a baselined asset that is gone fails selftest", code and "not on disk" in out, out.strip()[-200:])
    shutil.copy(WORKBOOK / "design-source/boss-kennedi/locked-poses/01-neutral.png",
                root / "design-source/boss-kennedi/locked-poses")
    recipe = root / LOCKED / "bunny-01-sitting.recipe.json"
    manifest = json.loads(recipe.read_text())
    manifest["prompt"] = manifest["prompt"].replace("bunny sitting", "bunny standing")
    recipe.write_text(json.dumps(manifest))
    code, out = run(root, "selftest")
    check("an edited recorded prompt fails selftest", code and "recorded prompt" in out, out.strip()[-200:])


def main():
    cases = [case_names_that_build_paths, case_pose_punctuation, case_dependent_color_lock, case_failed_vectorizer,
             case_candidate_is_not_its_recipe, case_reproduce_outputs, case_selftest_accounts_for_everything]
    for case in cases:
        print(f"\n== {case.__name__}: {case.__doc__}")
        with tempfile.TemporaryDirectory(prefix="recipe-test-") as tmp:
            case(workbook_copy(Path(tmp) / "workbook"))
    print(f"\n{sum(results)} of {len(results)} checks passed")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
