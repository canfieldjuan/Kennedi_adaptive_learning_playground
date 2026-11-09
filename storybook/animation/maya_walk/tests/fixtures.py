"""Public analytic measurement fixtures, not pretend Blender qualification.

Each measured signal has an independent exact oracle. This exercises validator
rules; the Blender adapter separately owns anatomical/coordinate consistency.
"""
from dataclasses import replace
import math

from storybook.animation.maya_walk.sample_scene import times
from storybook.animation.maya_walk.spec import BASELINE, Point, Sample, SceneKind, Side


def wave(phase, knots):
    q = phase % 1
    ordered = sorted(knots)
    extended = [(ordered[-1][0]-1, ordered[-1][1]), *ordered,
                (ordered[0][0]+1, ordered[0][1])]
    for (a, x), (b, y) in zip(extended, extended[1:]):
        if a <= q <= b:
            u = (q-a)/(b-a)
            return x+(y-x)*(1-math.cos(math.pi*u))/2
    raise AssertionError("Uncovered periodic fixture")


SPEC = replace(BASELINE, name="analytic-validator-fixture", speed_epsilon=.00001,
               expected_cadence=90., expected_step_hip_ratio=.45/.94)


def fixture():
    def at(t, side):
        q = (t+SPEC.offset(side))/SPEC.cycle_frames
        p = q % 1
        points = {"hip": (t*.9/32, 0., .94-.01*math.cos(4*math.pi*(p-.05))),
                  "knee": (t*.9/32+.1, 0., .5)}
        for hold in SPEC.holds(SceneKind.NATIVE):
            point = hold.point.value
            # Constant within the declared hold, otherwise advance to the next
            # plant with zero boundary derivatives and a positive airborne arc.
            cycle = math.floor(q-hold.start)
            phase = q-cycle
            if hold.start <= phase <= hold.end:
                x, z = .1+cycle*.9, 0.
            else:
                u = (phase-hold.end)/(1+hold.start-hold.end)
                x = .1+cycle*.9+.9*(1-math.cos(math.pi*u))/2
                z = .05*math.sin(math.pi*u)**2
            if hold.point is Point.TOE:
                z = wave(p, ((.125, 0), (.6, 0), (.68, .08), (.80, .025), (.95, .08)))
            points[point] = (x-SPEC.offset(side)*.9/32, 0., z+(.2 if point == "ankle" else 0))
        angles = {
            "knee": wave(p, ((0., 2), (.14, 18), (.40, 2), (.72, 62))),
            "hip": wave(p, ((.53, -10), (.88, 30))),
            "ankle": wave(p, ((.08, -10), (.45, 10), (.62, -20), (.90, 0))),
            "foot_pitch": 0.,
        }
        return points, angles

    rows = []
    h = 1/128
    for t in times(SPEC):
        for side in Side:
            before, ba = at(t-h, side)
            points, angles = at(t, side)
            after, aa = at(t+h, side)
            velocity = {p: tuple((b-a)/(2*h) for a, b in zip(before[p], after[p])) for p in points}
            omega = {key: (aa[key]-ba[key])/(2*h) for key in angles}
            rows.append(Sample(t, side, points, velocity, angles, omega, {}))
    return rows
