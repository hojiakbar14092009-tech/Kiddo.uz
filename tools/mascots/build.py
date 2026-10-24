"""
Build the Kiddo mascots: model, rig, animate and export each one as a GLB.

    python3 tools/mascots/build.py              # all mascots -> tools/mascots/out/<id>.glb
    python3 tools/mascots/build.py astro dinoo  # some of them
    python3 tools/mascots/build.py --render astro  # + quick Cycles turnaround PNGs (QA only)

Then `npm run mascots:optimize` compresses them into public/mascots and validates them.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import clips as cliplib  # noqa: E402
import kit  # noqa: E402
from mascots import MASCOTS  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def apply_clips(arm, library):
    # clips are authored at clips.FPS: the scene must play them at that rate
    bpy.context.scene.render.fps = cliplib.FPS
    bpy.context.scene.render.fps_base = 1.0
    bones = set(arm.pose.bones.keys())
    arm.animation_data_create()
    for name, clip in library.items():
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        arm.animation_data.action = action
        for pb in arm.pose.bones:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)
        rot, loc = clip.tracks()
        # every clip keys the root at its first and last frame, so its length is exact
        root = arm.pose.bones["Root"]
        for f in (1, clip.frames + 1):
            if "Root" not in rot:
                root.keyframe_insert("rotation_euler", frame=f)
        for bone, keys in rot.items():
            if bone not in bones:
                continue
            pb = arm.pose.bones[bone]
            for frame, value in sorted(keys):
                pb.rotation_euler = [math.radians(a) for a in value]
                pb.keyframe_insert("rotation_euler", frame=frame)
            pb.rotation_euler = (0, 0, 0)
        for bone, keys in loc.items():
            if bone not in bones:
                continue
            pb = arm.pose.bones[bone]
            for frame, value in sorted(keys):
                pb.location = value
                pb.keyframe_insert("location", frame=frame)
            pb.location = (0, 0, 0)
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
        arm.animation_data.action = None


def build(cid, render=False):
    spec = MASCOTS[cid]
    kit.reset_scene()
    ch = kit.Character(cid)
    spec["build"](ch)
    arm, body, face_keys = ch.build()
    apply_clips(arm, cliplib.clip_library(spec["style"]))
    os.makedirs(OUT, exist_ok=True)
    if render:
        import qa_render

        qa_render.turnaround(cid, os.path.join(OUT, "renders"))
        qa_render.closeup(cid, os.path.join(OUT, "renders"), target=spec.get("face_target", (0, 0, 1.94)))
    if "--poster" in sys.argv:
        import qa_render

        qa_render.poster(cid, os.path.join(OUT, "posters", f"{cid}.png"))
    path = os.path.join(OUT, f"{cid}.glb")
    kit.export_glb(path)
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    print(f"[mascot] {cid}: {len(body.data.vertices)} verts, ~{tris} tris, face keys {len(face_keys)} -> {path}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for cid in args or list(MASCOTS):
        build(cid, render="--render" in sys.argv)
