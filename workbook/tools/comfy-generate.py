#!/usr/bin/env python3
"""Submit a FLUX.1-dev txt2img job to a locally running ComfyUI and save the
result. Replicates comfyui_mcp_server.py's generate_image graph directly via
the HTTP API (bypassing the MCP stdio wrapper, which isn't hot-loaded into
this session)."""
import json
import os
import sys
import tempfile
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


def download(url, out_path, timeout=30):
    """Like urllib.request.urlretrieve(url, out_path), but with a timeout --
    urlretrieve accepts none, so if Comfy's /view endpoint accepts the
    connection and then stalls returning the image, this call hung
    indefinitely regardless of --timeout (which only bounds the polling
    loop above, not this final download).

    Downloads to a temp sibling first and only replaces out_path once the
    full response has been read, via an atomic rename -- opening out_path
    directly (the first version of this fix) truncates it immediately, so
    a timeout or dropped connection partway through the read left out_path
    an empty file. If --out names an existing, already-approved asset (a
    plausible way to invoke this tool while iterating), that failure mode
    destroyed it instead of just failing to produce a new one.

    The temp-file write also needs its own failure path handled, not just
    its success path: a first pass at this (write tmp_path, os.replace())
    left tmp_path behind as debris on any failure -- caught by testing the
    failure case directly (simulate a dropped connection, then check the
    directory), not just the success case. Any exception during the
    download or the replace removes the partial tmp_path and re-raises
    unchanged, so a failed run leaves exactly the same directory state as
    before it started -- either fully replaced, or untouched.

    tmp_path is created via tempfile.mkstemp() (O_CREAT|O_EXCL), not a
    predictable name -- a prior version derived it from out_path plus the
    running pid, which is guessable: in a shared-writable directory another
    local user could pre-create that exact path as a symlink to any file
    they can't otherwise write, and plain open(tmp_path, "wb") follows a
    symlink and truncates whatever it points to before os.replace() ever
    runs. mkstemp's O_EXCL create fails outright if the path already exists
    in any form (symlink included), so there's no path for an attacker to
    pre-place. It also makes tmp_path unique per call (not just per
    process), which subsumes the earlier pid-based fix for two invocations
    sharing the same --out.

    mkstemp creates tmp_path mode 0600 regardless of umask (that's the
    whole point of it, for cases where that's the desired security
    property), and os.replace() carries that mode onto out_path -- but here
    out_path is routinely an existing, previously-generated asset (see
    above), and silently narrowing a replaced file from 0644 to 0600 could
    leave it unreadable to whatever else reads it later. Explicitly chmod
    tmp_path to match out_path's current mode before replacing it when
    out_path already exists; otherwise fall back to the mode a normal
    open()/os.open() would have produced under the real umask, so a
    brand-new file isn't needlessly locked down either."""
    tmp_dir = os.path.dirname(os.path.abspath(out_path))
    fd, tmp_path = tempfile.mkstemp(dir=tmp_dir, prefix=os.path.basename(out_path) + ".", suffix=".part")
    try:
        if os.path.exists(out_path):
            os.chmod(tmp_path, os.stat(out_path).st_mode & 0o777)
        else:
            umask = os.umask(0o022)
            os.umask(umask)
            os.chmod(tmp_path, 0o666 & ~umask)
        with urllib.request.urlopen(url, timeout=timeout) as r, os.fdopen(fd, "wb") as f:
            f.write(r.read())
        os.replace(tmp_path, out_path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def flux_clip():
    return {"class_type": "DualCLIPLoader", "inputs": {
        "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
        "clip_name2": "clip_l.safetensors", "type": "flux"}}


def build_graph(prompt, width, height, seed, steps, negative):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-dev-Q8_0.gguf"}},
        "2": flux_clip(),
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "5": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["4", 0], "guidance": 3.5}},
        "6": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "positive": ["5", 0], "negative": ["6", 0],
            "latent_image": ["7", 0], "seed": seed, "steps": steps, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": "kennedi_concept/gen"}},
    }


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt")
    ap.add_argument("--width", type=int, default=1024)
    ap.add_argument("--height", type=int, default=1024)
    ap.add_argument("--steps", type=int, default=24)
    ap.add_argument("--seed", type=int, default=-1)
    ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()

    seed = args.seed if args.seed >= 0 else int.from_bytes(os.urandom(4), "big")
    graph = build_graph(args.prompt, args.width, args.height, seed, args.steps, None)
    client_id = "concept-gen"
    res = api("/prompt", {"prompt": graph, "client_id": client_id})
    if "prompt_id" not in res:
        print(f"REJECTED: {json.dumps(res)[:1500]}", file=sys.stderr)
        sys.exit(1)
    prompt_id = res["prompt_id"]
    print(f"queued prompt_id={prompt_id} seed={seed}", file=sys.stderr)

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
                download(view_url, args.out)
                print(f"saved: {args.out}", file=sys.stderr)
                print(args.out)
                return
        time.sleep(2)
    print("TIMEOUT waiting for job", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
