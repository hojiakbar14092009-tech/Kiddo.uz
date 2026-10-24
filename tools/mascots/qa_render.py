"""Quick Cycles turnaround renders of the current scene (development QA only, not shipped)."""

import math
import os

import bpy
from mathutils import Vector

ANGLES = (("front", 0), ("front34", 45), ("side", 90), ("back34", 135), ("back", 180))


def turnaround(cid, out_dir, size=360, samples=12):
    os.makedirs(out_dir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.device = "CPU"
    scene.render.resolution_x = size
    scene.render.resolution_y = int(size * 1.15)
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("w")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.92, 0.93, 0.96, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(40), math.radians(10), math.radians(-30))
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 70
    scene.collection.objects.link(cam)
    scene.camera = cam
    target = Vector((0, 0, 1.35))
    for name, deg in ANGLES:
        a = math.radians(deg)
        cam.location = target + Vector((math.sin(a) * 9.5, -math.cos(a) * 9.5, 0.6))
        direction = target - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(out_dir, f"{cid}-{name}.png")
        bpy.ops.render.render(write_still=True)


def closeup(cid, out_dir, target=(0, 0, 1.94), dist=3.2, size=360, samples=12, name="face", angle=0):
    os.makedirs(out_dir, exist_ok=True)
    scene = bpy.context.scene
    cam = scene.camera
    a = math.radians(angle)
    t = Vector(target)
    cam.location = t + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.2))
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(out_dir, f"{cid}-{name}.png")
    bpy.ops.render.render(write_still=True)


def poster(cid, path, size=(400, 480), samples=24):
    """The mascot's static picture (fallback when WebGL is missing or the device is weak)."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    if scene.world is None:
        world = bpy.data.worlds.new("w")
        scene.world = world
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[0].default_value = (0.95, 0.95, 0.97, 1)
    sun = bpy.data.objects.new("poster_sun", bpy.data.lights.new("poster_sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(40), math.radians(10), math.radians(-30))
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new("poster_cam", bpy.data.cameras.new("poster_cam"))
    cam.data.lens = 70
    scene.collection.objects.link(cam)
    scene.camera = cam
    # frame the whole character from a friendly 3/4 front view
    from mathutils import Vector

    pts = [o.matrix_world @ Vector(c) for o in scene.objects if o.type == "MESH" for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    target = (lo + hi) / 2
    radius = max(hi.z - lo.z, hi.x - lo.x) * 0.62
    a = math.radians(20)
    dist = radius / math.tan(math.radians(14))
    cam.location = target + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.25 * radius))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
