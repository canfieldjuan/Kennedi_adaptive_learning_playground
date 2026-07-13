#!/usr/bin/env python3
"""Render the Emma voice pack from the manifest — an OFFLINE build tool.

Usage (any environment with kokoro + soundfile + ffmpeg; the Atlas venv works):

    python scripts/voice/generate_voice_pack.py [--only-missing]

Reads src/content/voice/emma-voice-manifest.json and writes one MP3 per line
to public/assets/audio/voice/emma/<id>.mp3 (48 kbps mono, loudness-normalized).
The authoring stack is never a runtime dependency: the game only ever loads
the static MP3s.

Recipe (owner listen-approved 2026-07-13):
  voice   kokoro bf_emma (British pipeline)
  prompt  speed 0.92
  story   speed 0.90
  phonics speed 0.75  (the whole-line-slower variant the owner picked)
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MANIFEST = os.path.join(ROOT, "src", "content", "voice", "emma-voice-manifest.json")
OUT_DIR = os.path.join(ROOT, "public", "assets", "audio", "voice", "emma")
SPEEDS = {"prompt": 0.92, "story": 0.90, "phonics": 0.75}
SR = 24000

def main() -> None:
    only_missing = "--only-missing" in sys.argv
    with open(MANIFEST) as fh:
        manifest = json.load(fh)
    assert manifest["voice"] == "kokoro/bf_emma", manifest["voice"]
    os.makedirs(OUT_DIR, exist_ok=True)

    pipeline = KPipeline(lang_code="b", device="cpu")
    todo = [
        line for line in manifest["lines"]
        if not (only_missing and os.path.exists(os.path.join(OUT_DIR, f"{line['id']}.mp3")))
    ]
    print(f"rendering {len(todo)}/{len(manifest['lines'])} lines")
    for index, line in enumerate(todo, 1):
        speed = SPEEDS[line["style"]]
        chunks = [np.asarray(a) for _g, _p, a in pipeline(line["text"], voice="bf_emma", speed=speed)]
        wav = np.concatenate(chunks)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, wav, SR)
            tmp_path = tmp.name
        out = os.path.join(OUT_DIR, f"{line['id']}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp_path,
             "-af", "loudnorm=I=-18:TP=-2:LRA=9", "-ac", "1", "-b:a", "48k", out],
            check=True,
        )
        os.unlink(tmp_path)
        if index % 25 == 0 or index == len(todo):
            print(f"  {index}/{len(todo)}")
    print("done")

if __name__ == "__main__":
    main()
