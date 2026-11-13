from dataclasses import replace
import copy
import unittest

from storybook.animation.maya_walk.__main__ import BASELINES
from storybook.animation.maya_walk.spec import BASELINE, FINE_SPACING, MotionTrack, Sample, SamplePacket, Side
from storybook.animation.maya_walk.tests.fixtures import fixture, tracks


class AdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = fixture()[0]
        cls.row = {"time": r.time, "side": r.side.value, "ik_target": r.ik_target,
                   **{key: dict(getattr(r, key)) for key in ("points", "velocity", "angles", "angular_velocity", "upper")}}
        cls.track = tracks()[Side.NEAR].to_dict()
        cls.packet = {"format": "maya-walk-samples-v3", "alias": "native", "scene_sha256": BASELINES["native"][2],
                      "scene_kind": "native", "runtime": {"version": "fixture", "build": "fixture", "factory_process": True, "autoexec_disabled": True},
                      "fps": 24, "scene_units_meters": 1., "rest_hip_height": .94, "spec": BASELINE.to_dict(),
                      "time_domain": [0, 128], "validation_domain": [0, 127], "derivative_half_width": 1/128,
                      "point_definition": "public fixture", "actions": [], "samples": [cls.row],
                      "tracks": [t.to_dict() for t in tracks().values()]}

    def test_valid_closed_packet_and_immutable_vectors(self):
        model = SamplePacket.from_dict(self.packet)
        self.assertEqual(model.alias.value, "native")
        with self.assertRaises(TypeError):
            model.samples[0].points["hip"] = (0, 0, 0)
        with self.assertRaises(TypeError):
            model.samples[0].points["hip"][0] = 0

    def test_unknown_and_missing_fields_rejected(self):
        for field in self.packet:
            data = copy.deepcopy(self.packet)
            del data[field]
            with self.subTest(field=field), self.assertRaises((ValueError, TypeError)):
                SamplePacket.from_dict(data)
        with self.assertRaises(ValueError):
            SamplePacket.from_dict({**self.packet, "unexpected": True})

    def test_alias_is_closed_before_it_can_construct_plot_paths(self):
        for alias in ("../escape", "/tmp/escape", "", False, "native/other"):
            with self.subTest(alias=alias), self.assertRaises((ValueError, TypeError)):
                SamplePacket.from_dict({**self.packet, "alias": alias})

    def test_partial_point_and_joint_sets_never_admitted(self):
        for field, missing in (("points", "ankle"), ("velocity", "toe"), ("angles", "knee"), ("angular_velocity", "hip")):
            row = copy.deepcopy(self.row)
            del row[field][missing]
            with self.subTest(field=field), self.assertRaises(ValueError):
                Sample.from_dict(row)

    def test_nonfinite_falsy_and_wrong_units_rejected(self):
        for field in ("fps", "rest_hip_height", "scene_units_meters", "derivative_half_width"):
            for value in (0, "", False, float("nan"), float("inf")):
                with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                    SamplePacket.from_dict({**self.packet, field: value})
        with self.assertRaises(ValueError):
            SamplePacket.from_dict({**self.packet, "scene_units_meters": .01})

    def test_runtime_and_time_domain_are_required(self):
        data = copy.deepcopy(self.packet)
        data["runtime"]["factory_process"] = False
        with self.assertRaises(ValueError):
            SamplePacket.from_dict(data)
        data = copy.deepcopy(self.packet)
        data["samples"][0]["time"] = 128.25
        with self.assertRaises(ValueError):
            SamplePacket.from_dict(data)


    def test_fine_track_refusals(self):
        def bad(**change):
            return {**copy.deepcopy(self.track), **change}
        def column(value, at=5):
            values = list(self.track["angles"]["knee"]); values[at] = value
            return {**self.track["angles"], "knee": values}
        cases = {
            "finer spacing": bad(spacing=1/16), "zero spacing": bad(spacing=0.), "negative spacing": bad(spacing=-FINE_SPACING),
            "integer spacing": bad(spacing=0), "boolean spacing": bad(spacing=True), "nonfinite start": bad(start=float("nan")),
            "two samples": bad(angles={k: v[:2] for k, v in self.track["angles"].items()},
                               progress_x={k: v[:2] for k, v in self.track["progress_x"].items()}),
            "empty": bad(angles={k: [] for k in self.track["angles"]}, progress_x={k: [] for k in self.track["progress_x"]}),
            "unequal columns": bad(angles={**self.track["angles"], "knee": self.track["angles"]["knee"][:-1]}),
            "nan value": bad(angles=column(float("nan"))), "infinite value": bad(angles=column(float("inf"))),
            "boolean value": bad(angles=column(True)), "string value": bad(angles=column("1")),
            "missing joint": bad(angles={k: v for k, v in self.track["angles"].items() if k != "ankle"}),
            "extra joint": bad(angles={**self.track["angles"], "elbow": self.track["angles"]["knee"]}),
            "missing point": bad(progress_x={k: v for k, v in self.track["progress_x"].items() if k != "toe"}),
            "extra point": bad(progress_x={**self.track["progress_x"], "heel": self.track["progress_x"]["toe"]}),
            "non-sequence column": bad(angles={**self.track["angles"], "knee": 1.}),
            "unknown side": bad(side="left"),
        }
        self.assertIsInstance(MotionTrack.from_dict(copy.deepcopy(self.track)), MotionTrack)
        for name, data in cases.items():
            with self.subTest(name=name), self.assertRaises((ValueError, TypeError)):
                MotionTrack.from_dict(data)
        with self.assertRaises(ValueError):
            MotionTrack.from_dict({**self.track, "unexpected": 1})

    def test_packet_requires_v3_and_one_full_track_per_side(self):
        near, far = (t.to_dict() for t in tracks().values())
        short = {**far, "angles": {k: v[:-1] for k, v in far["angles"].items()},
                 "progress_x": {k: v[:-1] for k, v in far["progress_x"].items()}}
        late = {**far, "start": 0.}
        for name, change in {"v2 format": {"format": "maya-walk-samples-v2"}, "no tracks": {"tracks": []},
                             "one side": {"tracks": [near]}, "duplicate side": {"tracks": [near, near]},
                             "three tracks": {"tracks": [near, far, far]}, "short track": {"tracks": [near, short]},
                             "late start": {"tracks": [near, late]}}.items():
            with self.subTest(name=name), self.assertRaises(ValueError):
                SamplePacket.from_dict({**copy.deepcopy(self.packet), **change})
        model = SamplePacket.from_dict(copy.deepcopy(self.packet))
        self.assertEqual(set(model.track_map()), set(Side))


if __name__ == "__main__":
    unittest.main()
