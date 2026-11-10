"""Rebuild every native action from sparse source, starting from pinned paint."""
import argparse
from dataclasses import asdict
import hashlib
import json
import os
from pathlib import Path
import sys

sys.dont_write_bytecode=True
if __package__ in (None,''):
    sys.path.insert(0,str(Path(__file__).resolve().parents[3]))
from storybook.animation.maya_walk.__main__ import BASELINES, write_json
from storybook.animation.maya_walk.poses import author, AMPLITUDES
from storybook.animation.maya_walk.blender_writer import write_motion, InvalidMotion
from storybook.animation.maya_walk.legacy_scene import static_snapshot


def main():
    import bpy
    os.umask(0o077)
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    source=Path(bpy.data.filepath).resolve(); out=args.output_dir.resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASELINES['painted'][2]:
        raise ValueError('Build requires pinned first-painted input')
    if bpy.app.build_hash.decode()!='d13f752e3b9c':
        raise ValueError('Unqualified Blender build')
    if bpy.app.handlers.frame_change_pre or bpy.app.handlers.frame_change_post:
        raise ValueError('Playback handlers forbidden')
    target=out/'maya-reference-walk.blend'
    if target.exists() or target==source:
        raise ValueError('Build output must be new')
    before=static_snapshot(bpy)
    if before['images'].get('maya-parts-v2.png')!='fed9306a311b64161d269dcaa1a8ddaaa9dc3cc16b8415c255de24caf3e21f81':
        raise ValueError('Packed original atlas mismatch')
    motion=author()
    try:
        source_report = write_motion(bpy,motion)
    except InvalidMotion as error:
        write_json(out/'source-validation.json',error.report)
        raise
    write_json(out/'source-validation.json',source_report)
    after=static_snapshot(bpy)
    if after!=before:
        raise ValueError('Action rebuild changed static rig or artwork')
    scene=bpy.context.scene
    scene.render.fps=motion.spec.fps; scene.render.fps_base=1.
    scene['proof_status']='Reference gait candidate / NOT ACCEPTED / validation required'
    scene['motion_source']='storybook.animation.maya_walk.poses; periodic sparse PCHIP'
    scene['gait_spec']=json.dumps(motion.spec.to_dict(),sort_keys=True)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    target.chmod(0o600)
    write_json(out/'authored-source.json',{'spec':motion.spec.to_dict(),'amplitudes':asdict(AMPLITUDES),
        'curves':[asdict(c) for c in motion.curves]})
    write_json(out/'static-preservation.json',{'status':'PASS','input_sha256':BASELINES['painted'][2],
        'output_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'static':before})
    print('AUTHORED_SCENE',json.dumps({'output':str(target),'channels':len(motion.curves),
        'maximum_keys_per_cycle':max(len(c.keys) for c in motion.curves),'static_preservation':'PASS'}),flush=True)


if __name__=='__main__':
    main()
