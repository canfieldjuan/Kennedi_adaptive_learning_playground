from dataclasses import replace
import copy
import unittest

from storybook.animation.maya_walk.__main__ import BASELINES
from storybook.animation.maya_walk.spec import BASELINE, Sample, SamplePacket
from storybook.animation.maya_walk.tests.fixtures import fixture


class AdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = fixture()[0]
        cls.row = {"time": r.time, "side": r.side.value, "ik_target": r.ik_target,
                   **{key: dict(getattr(r, key)) for key in ("points", "velocity", "angles", "angular_velocity", "upper")}}
        cls.packet = {"format": "maya-walk-samples-v2", "alias": "native", "scene_sha256": BASELINES["native"][2],
                      "scene_kind": "native", "runtime": {"version": "fixture", "build": "fixture", "factory_process": True, "autoexec_disabled": True},
                      "fps": 24, "scene_units_meters": 1., "rest_hip_height": .94, "spec": BASELINE.to_dict(),
                      "time_domain": [0, 128], "validation_domain": [0, 127], "derivative_half_width": 1/128,
                      "point_definition": "public fixture", "actions": [], "samples": [cls.row]}

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


if __name__ == "__main__":
    unittest.main()
