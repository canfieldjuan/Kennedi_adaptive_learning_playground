"""One whole-cycle validator for fixtures and independently sampled saved scenes."""
from collections import Counter
from dataclasses import dataclass
import math

from .reference import Kind, SIGNATURES, SOURCES
from .sample_scene import angle_delta
from .spec import (GaitSpec, MotionTrack, Point, Sample, SceneKind, Side, finite,
                   THIGH_LENGTH, SHIN_LENGTH, REACH_TOLERANCE)


class TrackCoverageError(ValueError):
    """The fine track does not reach one grid step beyond a measured window."""


def progression_applies(point, phase, spec):
    """Hip and knee always progress; swing ankle/toe progress from release."""
    return point in ("hip", "knee") or (point in ("ankle", "toe") and phase >= spec.toe_off-1e-10)


def interval_motion(times, angles, progress_x, spec, start, end, spacing):
    """The one fine-interval measurement shared by validator and objective.

    ``times`` is a uniform grid of ``spacing``; each column holds one value per
    time. At every grid time t in [start, end] the joint value is the
    angle-wrapped exact second difference
    ``.25*|θ(t+δ)-2θ(t)+θ(t-δ)|/δ²`` (degrees/frame per quarter frame): a
    triangle-weighted average of true acceleration over [t-δ, t+δ], whose
    weights sum to one at every instant. Forward velocity is the exact average
    over each grid interval inside [start, end]. Plain floats and
    differentiable scalars both pass through unchanged arithmetic.
    """
    tol = 1e-9
    centres = [i for i in range(1, len(times)-1) if start-tol <= times[i] <= end+tol]
    if (not centres or abs(times[centres[0]]-start) > tol or abs(times[centres[-1]]-end) > tol or
            len(centres) < 2):
        raise TrackCoverageError("Fine track must reach one step beyond both window ends on its grid")
    acceleration = {joint: [(times[i], .25*abs(angle_delta(c[i+1], c[i])-angle_delta(c[i], c[i-1]))/spacing**2)
                            for i in centres] for joint, c in angles.items()}
    forward = {point: [(times[i], times[i+1], (c[i+1]-c[i])/spacing,
                        progression_applies(point, (times[i]-start)/spec.cycle_frames, spec))
                       for i in centres[:-1]] for point, c in progress_x.items()}
    return {"acceleration": acceleration, "forward": forward}


def measurement_resolution(spec, spacing):
    """What the fine measurement is guaranteed to detect (Amendment 1).

    A fast angle step centred on a grid time splits into two half steps, so a
    step is detected above ``8·limit·δ²``. A same-signed velocity change inside
    any δ window touches at most three unit-sum kernels, so it is detected above
    ``12·limit·δ``. Forward velocity is an exact interval average.
    """
    limit = spec.velocity_change_per_quarter
    return {"spacing_frames": spacing,
            "angle_step_detected_above_degrees": 8*limit*spacing**2,
            "velocity_change_detected_above_degrees_per_frame": 12*limit*spacing,
            "backward_displacement_detected_above_units": spec.backward_tolerance*spacing}


@dataclass(frozen=True)
class Peak:
    phase: float
    value: float
    kind: Kind
    prominence: float


def extrema(phases, values, prominence, circular=True):
    """Topographic prominence, with circular seam and plateau handled once.

    Walk each side until higher terrain or the full cycle. A peak's prominence
    is its smaller descent. Negate values for troughs. This is independent of
    authored keys and catches extrema created by native IK between those keys.
    """
    if len(phases) != len(values) or len(values) < 3:
        raise ValueError("At least three paired samples required")
    if not finite(prominence) or prominence <= 0:
        raise ValueError("Positive prominence required")
    if not all(finite(v) for v in (*phases, *values)):
        raise ValueError("Nonfinite extremum input")
    if any(b <= a for a, b in zip(phases, phases[1:])):
        raise ValueError("Strictly increasing phase samples required")
    runs = []
    for i, value in enumerate(values):
        if runs and abs(value-values[runs[-1][-1]]) <= 1e-8:
            runs[-1].append(i)
        else:
            runs.append([i])
    if circular and len(runs) > 1 and abs(values[runs[0][0]]-values[runs[-1][-1]]) <= 1e-8:
        runs[0] = runs.pop() + runs[0]
    if len(runs) < 3:
        return []
    peaks = []
    for r, indices in enumerate(runs):
        if not circular and r in (0, len(runs)-1):
            continue
        value = values[indices[0]]
        left = values[runs[(r-1) % len(runs)][0]]
        right = values[runs[(r+1) % len(runs)][0]]
        sign = 1 if value > left and value > right else -1 if value < left and value < right else 0
        if not sign:
            continue
        drops = []
        for direction, edge in ((-1, indices[0]), (1, indices[-1])):
            minimum = sign * value
            for step in range(1, len(values)):
                j = edge+direction*step
                if not circular and not 0 <= j < len(values):
                    break
                v = sign * values[j % len(values)]
                if v > sign*value + 1e-8:
                    break
                minimum = min(minimum, v)
            drops.append(sign*value-minimum)
        prominence_actual = min(drops)
        if prominence_actual + 1e-10 < prominence:
            continue
        first, last = phases[indices[0]], phases[indices[-1]]
        width = (last-first) % 1 if circular else last-first
        phase = (first+width/2) % 1 if circular else first+width/2
        peaks.append(Peak(phase, value, Kind.MAXIMUM if sign > 0 else Kind.MINIMUM, prominence_actual))
    return sorted(peaks, key=lambda x: x.phase)


def _speed(vector):
    return math.sqrt(sum(v*v for v in vector))


def validate_cycle(samples, spec, kind, *, tracks, fps, rest_hip_height, scene_sha256, alias):
    """Validate every full steady cycle and report all rule violations.

    Missing observations are failures, never inferred success. Input types own
    structural validation; this function owns cross-channel/temporal semantics.
    Units are scene units and frames unless explicitly labeled otherwise.
    Angular acceleration and point direction read only the fine ``tracks``
    (one ``MotionTrack`` per side); every other rule reads ``samples``.
    """
    if not isinstance(spec, GaitSpec) or not isinstance(kind, SceneKind):
        raise ValueError("Typed gait spec and scene kind required")
    if (not isinstance(tracks, dict) or set(tracks) != set(Side) or
            any(not isinstance(t, MotionTrack) or t.side is not s for s, t in tracks.items())):
        raise ValueError("One typed fine track per side required")
    if not finite(fps) or fps <= 0 or not finite(rest_hip_height) or rest_hip_height <= 0:
        raise ValueError("Positive finite fps and hip height required")
    if not all(isinstance(r, Sample) for r in samples):
        raise ValueError("Validated sample records required")
    violations, cycles, contact_events, contact_coverage = [], [], [], []

    def fail(rule, side, cycle, time, channel, value, limit, unit):
        violations.append({"rule": rule, "side": side.value if side else None,
                           "cycle": cycle, "frame": None if time is None else time+1,
                           "phase": None if time is None or side is None else
                           ((time+spec.offset(side))/spec.cycle_frames) % 1,
                           "channel": channel, "value": value, "limit": limit, "unit": unit})

    for side in Side:
        rows = [r for r in samples if r.side is side]
        if not rows or any(b.time <= a.time for a, b in zip(rows, rows[1:])):
            fail("sample_order_or_missing_leg", side, None, None, "samples", len(rows), "nonempty, ordered, unique", "samples")
            continue
        by_time = {round(r.time, 9): r for r in rows}
        required_points = {p.value for p in Point if p is not Point.PAINTED_HEEL or kind is SceneKind.PAINTED}
        if any(set(r.points) != required_points or bool(r.upper) != (kind is SceneKind.PAINTED) for r in rows):
            fail("scene_inventory", side, None, None, "points/upper", "inconsistent", kind.value, "inventory")
            continue
        # Observe heel contact from evaluated world geometry, not spec events.
        timeline = [r for r in rows if 0 <= r.time <= 127]
        grid_all = [r for r in timeline if abs(r.time*4-round(r.time*4)) < 1e-7]
        previously_down = False
        for row in timeline:
            down = abs(row.points["heel"][2]) <= spec.ground_tolerance and _speed(row.velocity["heel"]) <= spec.speed_epsilon
            if down and not previously_down:
                contact_events.append({"side": side.value, "time": row.time, "frame": row.time+1,
                                       "x": row.points["heel"][0]})
            previously_down = down

        declared = spec.cycles(side)
        if not declared:
            fail("no_complete_cycles", side, None, None, "coverage", 0, "at least one complete cycle", "cycles")
        holds = {h.point.value: h for h in spec.holds(kind)}
        primary_points = required_points - {"painted_heel"}
        continuous = [r for r in grid_all if declared and declared[0][1] <= r.time <= declared[-1][2]]
        # A run belongs to the measured timeline, not to a per-cycle bucket.
        # This preserves a stall that starts before and ends after a seam.
        for point in sorted(primary_points):
            run = []

            def flush_stall():
                if len(run) >= spec.stall_intervals:
                    t = run[0][0]
                    cycle = math.floor((t+spec.offset(side))/spec.cycle_frames)
                    fail("point_stall", side, cycle, t, point,
                         {"intervals": len(run), "end_frame": run[-1][1]+1, "maximum_speed": max(v[2] for v in run)},
                         {"speed": spec.speed_epsilon, "intervals": spec.stall_intervals}, "units/frame")
                run.clear()

            for a, b in zip(continuous, continuous[1:]):
                if abs(b.time-a.time-.25) > 1e-7:
                    flush_stall()
                    continue  # missing_sample is reported by cycle coverage
                cycle = math.floor((a.time+spec.offset(side))/spec.cycle_frames)
                origin = cycle*spec.cycle_frames-spec.offset(side)
                p0, p1 = (a.time-origin)/spec.cycle_frames, (b.time-origin)/spec.cycle_frames
                held = point in holds and holds[point].covers(p0, p1)
                speed = math.dist(a.points[point], b.points[point])/(b.time-a.time)
                if speed < spec.speed_epsilon and not held:
                    run.append((a.time, b.time, speed))
                else:
                    flush_stall()
            flush_stall()
        for number, start, end in declared:
            # Each full cycle needs both observed boundary contacts. A few
            # early plants cannot establish contact coverage of later cycles.
            for boundary, time in (("start", start), ("end", end)):
                matches = [c for c in contact_events if c["side"] == side.value and
                           abs(c["time"]-time) <= spec.contact_time_tolerance+1e-10]
                contact_coverage.append({"side": side.value, "cycle": number, "boundary": boundary,
                                         "expected_frame": time+1, "observed_frames": [c["frame"] for c in matches]})
                if len(matches) != 1:
                    fail("contact_coverage", side, number, time, "heel",
                         {"boundary": boundary, "matches": len(matches), "observed_frames": [c["frame"] for c in matches]},
                         {"count": 1, "expected_frame": time+1, "tolerance_frames": spec.contact_time_tolerance}, "events")
            expected_times = sorted({round(start, 9), round(end, 9),
                                     *(i/4 for i in range(math.ceil(start*4), math.floor(end*4)+1))})
            event_times = {name: round(start+phase*spec.cycle_frames, 9) for name, phase in
                           (("flat", spec.foot_flat), ("heel_off", spec.heel_off),
                            ("ball_off", spec.ball_off), ("toe_off", spec.toe_off))}
            missing = [t for t in (*expected_times, *event_times.values(),
                                   round(event_times["toe_off"]+1/128, 9)) if t not in by_time]
            if missing:
                for t in missing:
                    fail("missing_sample", side, number, t, "coverage", None, "required grid/event sample", "frame")
                continue
            grid = [by_time[t] for t in expected_times]
            observations = [r for r in rows if start <= r.time <= end]
            phases = [(r.time-start)/spec.cycle_frames for r in observations[:-1]]
            report = {"side": side.value, "cycle": number, "frames": [start+1, end+1],
                      "grid_samples": len(grid), "observation_samples": len(observations),
                      "extrema": {}, "point_minimum_speed": {},
                      "joint_maximum_velocity_change": {}}
            for row in observations:
                reach = math.dist(row.points["hip"], row.ik_target)
                low, high = abs(THIGH_LENGTH-SHIN_LENGTH), THIGH_LENGTH+SHIN_LENGTH
                if not low-REACH_TOLERANCE <= reach <= high+REACH_TOLERANCE:
                    fail("ik_target_unreachable", side, number, row.time, "ik_target", reach,
                         {"minimum": low, "maximum": high, "tolerance": REACH_TOLERANCE}, "units")
            for signal, signature in SIGNATURES.items():
                values = ([r.points["hip"][2] for r in observations[:-1]] if signal == "pelvis_height"
                          else [r.angles[signal] for r in observations[:-1]])
                prominence = spec.height_prominence if signal == "pelvis_height" else spec.angular_prominence
                peaks = extrema(phases, values, prominence)
                report["extrema"][signal] = [vars(p) for p in peaks]
                if len(peaks) != len(signature):
                    fail("extrema_count", side, number, start, signal, len(peaks), len(signature), "extrema")
                if max(values)-min(values) < prominence:
                    fail("missing_amplitude", side, number, start, signal, max(values)-min(values), prominence, "units" if signal == "pelvis_height" else "degrees")
                assignments = Counter()
                for p in peaks:
                    matches = [i for i, expected in enumerate(signature) if expected.kind is p.kind and expected.contains(p.phase)]
                    time = start+p.phase*spec.cycle_frames
                    if len(matches) != 1:
                        fail("extrema_phase_order", side, number, time, signal, {"kind": p.kind, "phase": p.phase},
                             [{"kind": x.kind, "window": [x.start, x.end]} for x in signature], "cycle fraction")
                        continue
                    index = matches[0]
                    assignments[index] += 1
                    expected = signature[index]
                    if expected.low is not None and not expected.low-1e-6 <= p.value <= expected.high+1e-6:
                        fail("extrema_amplitude", side, number, time, signal, p.value, [expected.low, expected.high], "degrees")
                for i, expected in enumerate(signature):
                    if assignments[i] != 1:
                        fail("missing_or_duplicate_extremum", side, number, start, signal,
                             assignments[i], {"count": 1, "kind": expected.kind, "window": [expected.start, expected.end]}, "extrema")

            for lo, hi in ((.95, .05), (.35, .45)):
                selected = [r for r, p in zip(observations[:-1], phases)
                            if ((p >= lo or p <= hi) if lo > hi else lo <= p <= hi)]
                if not selected:
                    fail("missing_window_samples", side, number, start, "knee", 0, [lo, hi], "cycle fraction")
                    continue
                minimum = min(selected, key=lambda r: r.angles["knee"])
                if not 0 <= minimum.angles["knee"] <= 5:
                    fail("knee_near_straight", side, number, minimum.time, "knee", minimum.angles["knee"], [0, 5], "degrees")
            if not 0 <= grid[0].angles["knee"] <= 5:
                fail("knee_contact_extension", side, number, start, "knee", grid[0].angles["knee"], [0, 5], "degrees")

            for point in sorted(primary_points):
                # Spatial safety applies to every observed point, including
                # exact events and one-sided samples. Only the duration-based
                # stall counter above intentionally uses a quarter-frame grid.
                for row in observations:
                    if point in ("heel", "ball", "toe") and row.points[point][2] < -spec.height_prominence:
                        fail("ground_penetration", side, number, row.time, point, row.points[point][2], -spec.height_prominence, "units")
                    phase = (row.time-start)/spec.cycle_frames
                    if point in holds and holds[point].covers(phase, phase):
                        anchor = by_time[round(start+holds[point].start*spec.cycle_frames, 9)]
                        drift = math.dist(anchor.points[point], row.points[point])
                        if drift > spec.hold_position_tolerance:
                            fail("hold_slip", side, number, row.time, point, drift, spec.hold_position_tolerance, "units")
                # Reported speed only; direction is a fine-track rule below.
                report["point_minimum_speed"][point] = min(
                    _speed([(y-x)/(b.time-a.time) for x, y in zip(a.points[point], b.points[point])])
                    for a, b in zip(observations, observations[1:]))
                if point in holds:
                    hold = holds[point]
                    departure = by_time[round(start+hold.end*spec.cycle_frames, 9)]
                    later_time = round(departure.time+1/128, 9)
                    # Exact tiny one-sided samples are currently provided for toe-off.
                    # Other hold releases use the next quarter-frame observation.
                    later = by_time.get(later_time) or next(r for r in rows if r.time > departure.time)
                    distance = math.dist(departure.points[point], later.points[point])
                    if distance <= 1e-9:
                        fail("hold_release_no_motion", side, number, departure.time, point, distance, "> 1e-9", "units")
                    entry = start+hold.start*spec.cycle_frames
                    approach = [r for r in rows if entry-hold.approach*spec.cycle_frames <= r.time <= entry]
                    for a, b in zip(approach, approach[1:]):
                        delta = _speed(b.velocity[point])-_speed(a.velocity[point])
                        if delta > spec.contact_speed_tolerance:
                            fail("contact_reacceleration", side, number, b.time, point, delta, spec.contact_speed_tolerance, "units/frame")

            # Interval rules: measured across every fine interval, not only at
            # observation instants, so motion between observations is visible.
            track = tracks[side]
            report["measurement_resolution"] = measurement_resolution(spec, track.spacing)
            try:
                motion = interval_motion(track.times(), track.angles, track.progress_x,
                                         spec, start, end, track.spacing)
            except TrackCoverageError:
                fail("missing_sample", side, number, start, "fine_track", None,
                     "fine track covering the cycle with one step of margin", "frame")
                motion = None
            if motion is not None:
                for point, intervals in motion["forward"].items():
                    for t0, t1, forward_velocity, applies in intervals:
                        if applies and forward_velocity < -spec.backward_tolerance:
                            fail("point_backward", side, number, t0, point,
                                 {"forward_velocity": forward_velocity, "interval_frames": [t0+1, t1+1]},
                                 -spec.backward_tolerance, "units/frame")
                for joint, values in motion["acceleration"].items():
                    for time, jump in values:
                        if jump > spec.velocity_change_per_quarter:
                            fail("angular_velocity_jump", side, number, time, joint,
                                 {"degrees_per_frame_per_quarter": jump, "degrees_per_second_squared": jump/.25*fps*fps,
                                  "interval_frames": [time-track.spacing+1, time+track.spacing+1]},
                                 spec.velocity_change_per_quarter, "degrees/frame/quarter-frame")
                    report["joint_maximum_velocity_change"][joint] = max(jump for _, jump in values)

            release = by_time[event_times["toe_off"]]
            report["release"] = {}
            for point in ("ankle", "heel", "painted_heel"):
                if point not in required_points:
                    continue
                velocity = release.velocity[point]
                speed = _speed(velocity)
                report["release"][point] = {"speed": speed, "forward_speed": velocity[0]}
                if speed <= spec.speed_epsilon:
                    fail("release_stall", side, number, release.time, point, speed, spec.speed_epsilon, "units/frame")
                if velocity[0] < -spec.backward_tolerance:
                    fail("release_backward", side, number, release.time, point, velocity[0], -spec.backward_tolerance, "units/frame")

            swing = [r for r in observations if spec.toe_off < (r.time-start)/spec.cycle_frames < 1]
            sp = [(r.time-start)/spec.cycle_frames for r in swing]
            toe_peaks = extrema(sp, [r.points["toe"][2] for r in swing], spec.height_prominence, circular=False)
            minima = [p for p in toe_peaks if p.kind is Kind.MINIMUM]
            report["toe_clearance"] = {"extrema": [vars(p) for p in toe_peaks],
                                       "minimum_height": min(r.points["toe"][2] for r in swing),
                                       "interior_dip_normalized": [p.value/rest_hip_height for p in minima]}
            if len(minima) != 1 or not .75 <= minima[0].phase <= .85 or not any(p.kind is Kind.MAXIMUM and p.phase < minima[0].phase for p in toe_peaks):
                fail("toe_dip_signature", side, number, release.time, "toe", [vars(p) for p in toe_peaks], "rise/dip/rise with one dip at .75-.85", "cycle fraction")
            elif minima[0].value <= 0:
                fail("toe_clearance", side, number, start+minima[0].phase*spec.cycle_frames, "toe", minima[0].value, "> 0", "units")
            report["mean_hip_height"] = sum(r.points["hip"][2] for r in grid[:-1])/len(grid[:-1])
            if kind is SceneKind.PAINTED:
                report["upper_cycle_closure_degrees"] = {key: abs((grid[-1].upper[key]-grid[0].upper[key]+180)%360-180) for key in grid[0].upper}
                for key, error in report["upper_cycle_closure_degrees"].items():
                    if error > .01:
                        fail("upper_clock_closure", side, number, end, key, error, .01, "degrees")
            cycles.append(report)

    contacts = sorted(contact_events, key=lambda x: x["time"])
    steps = []
    for a, b in zip(contacts, contacts[1:]):
        if a["side"] == b["side"] or b["time"] <= a["time"]:
            fail("contact_sequence", Side(b["side"]), None, b["time"], "contacts", [a, b], "alternating feet, increasing time", "events")
            continue
        step = b["x"]-a["x"]
        ratio = step/rest_hip_height
        cadence = 60*fps/(b["time"]-a["time"])
        steps.append({"from_frame": a["frame"], "to_frame": b["frame"], "step_length": step,
                      "step_hip_ratio": ratio, "cadence": cadence, "speed": step*cadence/60})
        if abs(ratio-spec.expected_step_hip_ratio) > spec.ratio_tolerance:
            fail("global_step_ratio", Side(b["side"]), None, b["time"], "step_hip_ratio", ratio, spec.expected_step_hip_ratio, "ratio")
        if abs(cadence-spec.expected_cadence) > spec.cadence_tolerance:
            fail("global_cadence", Side(b["side"]), None, b["time"], "cadence", cadence, spec.expected_cadence, "steps/min")
    strides = []
    for side in Side:
        same_foot = [c for c in contacts if c["side"] == side.value]
        for a, b in zip(same_foot, same_foot[1:]):
            distance = b["x"]-a["x"]
            strides.append({"side": side.value, "from_frame": a["frame"], "to_frame": b["frame"],
                            "stride_length": distance, "stride_hip_ratio": distance/rest_hip_height,
                            "duration_frames": b["time"]-a["time"]})
    return {"format": "maya-walk-validation-v2", "alias": alias, "scene_sha256": scene_sha256,
            "status": "FAIL" if violations else "PASS", "spec": spec.to_dict(), "sources": SOURCES,
            "coverage": {"validation_scene_frames": [1, 128], "complete_cycles": len(cycles),
                         "expected_cycles": sum(len(spec.cycles(s)) for s in Side), "sample_rows": len(samples)},
            "global": {"fps": fps, "rest_hip_height": rest_hip_height, "contacts": contacts, "steps": steps,
                       "strides": strides,
                       "contact_coverage": contact_coverage,
                       "expected_cadence": spec.expected_cadence, "expected_step_hip_ratio": spec.expected_step_hip_ratio},
            "cycles": cycles, "violation_counts": dict(sorted(Counter(v["rule"] for v in violations).items())),
            "violations": violations, "artistic_acceptance": False}
