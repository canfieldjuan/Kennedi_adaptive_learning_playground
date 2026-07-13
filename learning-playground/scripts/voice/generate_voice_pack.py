#!/usr/bin/env python3
"""Render a voice pack from its manifest — an OFFLINE build tool.

Two packs, two recipes (both owner listen-approved):

  emma  (kokoro bf_emma, local pipeline; approved 2026-07-13)
      python scripts/voice/generate_voice_pack.py --pack emma [--only-missing]
      Needs: kokoro + soundfile (the Atlas venv works). Speeds:
      prompt 0.92 / story 0.90 / phonics 0.75.

  tara  (Orpheus orpheus-3b-ft.gguf via LM Studio; approved 2026-07-13 —
         the owner picked the expressive tara samples)
      python scripts/voice/generate_voice_pack.py --pack tara [--only-missing]
      Needs: LM Studio serving the model on :1234 and the Orpheus-FastAPI
      decoder on :5005 (~/Desktop/tts). A curated PERFORMANCE map adds
      emotion tags (<giggle>, <gasp>) to celebration lines and story
      openings — the clip id stays the hash of the CLEAN text the game
      speaks; only the rendered performance differs. Phonics clips get a
      gentle ffmpeg atempo slow-down (Orpheus has no speed parameter);
      the factor is owner-tunable via --phonics-tempo.

The game only ever loads the produced static MP3s; none of this stack
ships at runtime.
"""
import argparse
import json
import os
import subprocess
import tempfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SR = 24000

# Orpheus performance map: normalized clean text -> tagged render text.
# Curated and reviewable; keep tags rare so they stay delightful.
TARA_PERFORMANCES = {
    "You delivered it.": "You delivered it! <giggle>",
    "Yummy! Thank you.": "Yummy! <giggle> Thank you.",
    "Four cookies! Thank you.": "Four cookies! <giggle> Thank you.",
}
TARA_OPENING_TAG = (
    "Story time! This is the tale of",
    "Story time! <gasp> This is the tale of",
)


def performance_text(text):
    if text in TARA_PERFORMANCES:
        return TARA_PERFORMANCES[text]
    if text.startswith(TARA_OPENING_TAG[0]):
        return TARA_OPENING_TAG[1] + text[len(TARA_OPENING_TAG[0]):]
    return text


def encode_mp3(src_wav, out_mp3, atempo=None):
    filters = ["loudnorm=I=-18:TP=-2:LRA=9"]
    if atempo and abs(atempo - 1.0) > 0.01:
        filters.insert(0, f"atempo={atempo}")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", src_wav,
         "-af", ",".join(filters), "-ac", "1", "-b:a", "48k", out_mp3],
        check=True,
    )


def render_emma(lines, out_dir, only_missing):
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    speeds = {"prompt": 0.92, "story": 0.90, "phonics": 0.75}
    pipeline = KPipeline(lang_code="b", device="cpu")
    for index, line in enumerate(lines, 1):
        out = os.path.join(out_dir, f"{line['id']}.mp3")
        if only_missing and os.path.exists(out):
            continue
        chunks = [np.asarray(a) for _g, _p, a in pipeline(
            line["text"], voice="bf_emma", speed=speeds[line["style"]])]
        wav = np.concatenate(chunks)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, wav, SR)
            tmp_path = tmp.name
        encode_mp3(tmp_path, out)
        os.unlink(tmp_path)
        if index % 25 == 0 or index == len(lines):
            print(f"  {index}/{len(lines)}")


def render_tara(lines, out_dir, only_missing, phonics_tempo):
    api = "http://localhost:5005/v1/audio/speech"
    todo = [l for l in lines if not (
        only_missing and os.path.exists(os.path.join(out_dir, f"{l['id']}.mp3")))]
    print(f"rendering {len(todo)}/{len(lines)} via Orpheus-FastAPI")
    for index, line in enumerate(todo, 1):
        body = json.dumps({
            "input": performance_text(line["text"]),
            "voice": "tara",
            "model": "orpheus",
        }).encode()
        request = urllib.request.Request(
            api, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=180) as response:
            wav_bytes = response.read()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_bytes)
            tmp_path = tmp.name
        atempo = phonics_tempo if line["style"] == "phonics" else None
        encode_mp3(tmp_path, os.path.join(out_dir, f"{line['id']}.mp3"), atempo)
        os.unlink(tmp_path)
        if index % 25 == 0 or index == len(todo):
            print(f"  {index}/{len(todo)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pack", choices=["emma", "tara"], required=True)
    parser.add_argument("--only-missing", action="store_true")
    parser.add_argument("--phonics-tempo", type=float, default=0.85,
                        help="tara only: atempo factor for phonics clips")
    parser.add_argument("--styles", default="",
                        help="comma-separated style filter (e.g. phonics)")
    args = parser.parse_args()

    manifest_path = os.path.join(
        ROOT, "src", "content", "voice", f"{args.pack}-voice-manifest.json")
    with open(manifest_path) as fh:
        manifest = json.load(fh)
    lines = manifest["lines"]
    if args.styles:
        wanted = set(args.styles.split(","))
        lines = [l for l in lines if l["style"] in wanted]
    out_dir = os.path.join(ROOT, "public", "assets", "audio", "voice", args.pack)
    os.makedirs(out_dir, exist_ok=True)

    if args.pack == "emma":
        render_emma(lines, out_dir, args.only_missing)
    else:
        render_tara(lines, out_dir, args.only_missing, args.phonics_tempo)
    print("done")


if __name__ == "__main__":
    main()
