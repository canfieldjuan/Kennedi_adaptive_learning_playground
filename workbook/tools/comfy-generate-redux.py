#!/usr/bin/env python3
"""Character-consistent generation via FLUX.1 Redux (style/subject transfer):
encodes a reference image with SigCLIP, applies it as a style conditioning
on top of a new text prompt (new pose), so the output stays recognizably
"the same character" while following the new pose description. This is the
real consistency mechanism -- plain repeated text prompts do not lock
identity across generations.

Requires (already present in this ComfyUI install):
  models/style_models/flux1-redux-dev.safetensors
  models/clip_vision/sigclip_vision_patch14_384.safetensors
  models/unet/flux1-dev-Q8_0.gguf
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

COMFY = "http://127.0.0.1:8188"


def api(path, payload=None, timeout=30):
    url = f"{COMFY}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"} if data else {}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = r.read()
        return json.loads(body) if body else {}


def flux_clip():
    return {"class_type": "DualCLIPLoader", "inputs": {
        "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
        "clip_name2": "clip_l.safetensors", "type": "flux"}}


def build_graph(prompt, ref_image_rel_path, width, height, seed, steps, redux_strength, filename_prefix):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-dev-Q8_0.gguf"}},
        "2": flux_clip(),
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "20": {"class_type": "LoadImage", "inputs": {"image": ref_image_rel_path}},
        "21": {"class_type": "CLIPVisionLoader", "inputs": {"clip_name": "sigclip_vision_patch14_384.safetensors"}},
        "22": {"class_type": "CLIPVisionEncode", "inputs": {"clip_vision": ["21", 0], "image": ["20", 0], "crop": "center"}},
        "23": {"class_type": "StyleModelLoader", "inputs": {"style_model_name": "flux1-redux-dev.safetensors"}},
        "24": {"class_type": "StyleModelApply", "inputs": {
            "conditioning": ["4", 0], "style_model": ["23", 0], "clip_vision_output": ["22", 0],
            "strength": redux_strength, "strength_type": "multiply"}},
        "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["24", 0], "guidance": 3.5}},
        "6": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "positive": ["5", 0], "negative": ["6", 0],
            "latent_image": ["7", 0], "seed": seed, "steps": steps, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": filename_prefix}},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt")
    ap.add_argument("--ref", required=True, help="filename relative to ComfyUI input/ dir, e.g. kennedi-lock/kennedi-c-reference.png")
    ap.add_argument("--width", type=int, default=1024)
    ap.add_argument("--height", type=int, default=1024)
    ap.add_argument("--steps", type=int, default=30)
    ap.add_argument("--seed", type=int, default=-1)
    ap.add_argument("--redux-strength", type=float, default=0.65)
    ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()

    seed = args.seed if args.seed >= 0 else int.from_bytes(os.urandom(4), "big")
    graph = build_graph(args.prompt, args.ref, args.width, args.height, seed, args.steps, args.redux_strength, "kennedi_lock/gen")
    res = api("/prompt", {"prompt": graph, "client_id": "redux-gen"})
    if "prompt_id" not in res:
        print(f"REJECTED: {json.dumps(res)[:1500]}", file=sys.stderr)
        sys.exit(1)
    prompt_id = res["prompt_id"]
    print(f"queued prompt_id={prompt_id} seed={seed} redux_strength={args.redux_strength}", file=sys.stderr)

    start = time.time()
    while time.time() - start < args.timeout:
        hist = api(f"/history/{prompt_id}", timeout=10)
        if prompt_id in hist:
            entry = hist[prompt_id]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                msgs = [m[1].get("exception_message", "") for m in status.get("messages", []) if m[0] == "execution_error"]
                print(f"ERROR: {'; '.join(msgs)}", file=sys.stderr)
                sys.exit(1)
            outs = []
            for node_out in entry.get("outputs", {}).values():
                for item in node_out.get("images", []):
                    outs.append(item)
            if outs:
                item = outs[0]
                view_url = f"{COMFY}/view?" + urllib.parse.urlencode(
                    {"filename": item["filename"], "subfolder": item.get("subfolder", ""), "type": "output"}
                )
                urllib.request.urlretrieve(view_url, args.out)
                print(f"saved: {args.out}", file=sys.stderr)
                print(args.out)
                return
        time.sleep(2)
    print("TIMEOUT waiting for job", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
