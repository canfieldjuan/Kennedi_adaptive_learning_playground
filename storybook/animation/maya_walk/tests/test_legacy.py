from dataclasses import replace
from array import array
import json
from pathlib import Path
from types import SimpleNamespace
import math
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from storybook.animation.maya_walk.legacy import CHANNELS, Handle, Interpolation, LegacyFixture, SerializedCurve
from storybook.animation.maya_walk.legacy_scene import rna_values
from storybook.animation.maya_walk.parity import FIXTURE_SHA256, LOWER_BONES, compare_snapshots


class LegacyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = LegacyFixture.load(Path(__file__).with_name("legacy-actions.json"), FIXTURE_SHA256)

    def test_frozen_inventory_has_every_channel_and_preserves_dense_history(self):
        self.assertEqual({(c.owner, c.path, c.index) for c in self.fixture.curves}, CHANNELS)
        self.assertTrue(any(len(c.keys) > 12 for c in self.fixture.curves))
        self.assertEqual(len(self.fixture.curves), 134)

    def test_missing_duplicate_unknown_or_mutable_channels_fail(self):
        for curves in (self.fixture.curves[:-1], self.fixture.curves+(self.fixture.curves[0],), list(self.fixture.curves)):
            with self.assertRaises(ValueError):
                replace(self.fixture, curves=curves)
        with self.assertRaises(ValueError):
            replace(self.fixture.curves[0], owner="unowned")
        with self.assertRaises(ValueError):
            replace(self.fixture.curves[0], keys=list(self.fixture.curves[0].keys))

    def test_bad_key_policy_coordinates_and_order_fail(self):
        good = SerializedCurve("CTRL_Hips", "location", 0, Interpolation.BEZIER, Handle.FREE,
                               ((1., 0., 0., 0., 2., 1.), (3., 1., 2., 0., 4., 2.)))
        for kw in ({"interpolation": "BEZIER"}, {"index": False}, {"keys": ()},
                   {"keys": (good.keys[1], good.keys[0])}, {"keys": ((1., math.nan, 0., 0., 0., 0.),)}):
            with self.assertRaises(ValueError):
                replace(good, **kw)

    def test_rna_string_properties_have_no_array_attribute(self):
        properties = [SimpleNamespace(identifier="name", type="STRING"),
                      SimpleNamespace(identifier="amount", type="FLOAT", is_array=False),
                      SimpleNamespace(identifier="vector", type="FLOAT", is_array=True),
                      SimpleNamespace(identifier="flags", type="ENUM")]
        block = SimpleNamespace(bl_rna=SimpleNamespace(properties=properties), name="example", amount=2.,
                                vector=(1., 2., 3.), flags={"B", "A"})
        self.assertEqual(rna_values(block), {"name": "example", "amount": 2., "vector": [1., 2., 3.], "flags": ["A", "B"]})

    def test_parity_tolerance_cannot_be_disabled_or_relaxed(self):
        for value in (0, False, "", math.nan, math.inf, 1.1e-6):
            with self.subTest(value=value), self.assertRaises(ValueError):
                compare_snapshots(None, None, None, value)

    def test_numeric_comparison_catches_rebuilt_matrix_and_painted_vertex_changes(self):
        # Public synthetic arrays exercise comparison, not Blender or oracle
        # admission. Actual oracle admission is exercised by the local port.
        groups = [{"kind": "bone_matrix", "name": "MAYA_CONTROL_RIG/"+name, "size": 16}
                  for name in sorted(LOWER_BONES)] + [{"kind": "painted_vertices_world", "name": "public triangle", "size": 9}]
        manifest = {"format": "maya-parity-snapshot-v1", "runtime": "d13f752e3b9c", "frames": 513,
                    "start_frame": 1, "step": .25, "coordinate_format": "little-endian float64",
                    "source_sha256": "synthetic", "static": {}, "actions": {}, "groups": groups}
        oracle = [{name: [0.]*16 for name in LOWER_BONES} for _ in range(513)]
        count = sum(g["size"] for g in groups)

        def write(path, error):
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("manifest.json", json.dumps(manifest))
                for index in range(513):
                    values = array("d", [0.]*count)
                    if index == 127:
                        values[0] = values[-1] = error
                    if sys.byteorder != "little":
                        values.byteswap()
                    archive.writestr(f"frames/{index:04d}.bin", values.tobytes())

        with tempfile.TemporaryDirectory() as directory, patch("storybook.animation.maya_walk.parity.read_oracle", return_value=oracle):
            a, b = Path(directory)/"a.zip", Path(directory)/"b.zip"
            write(a, 0.)
            for error, expected in ((0., "PASS"), (1e-6, "PASS"), (1.01e-6, "FAIL")):
                write(b, error)
                result = compare_snapshots(a, b, None)
                self.assertEqual(result["status"], expected)
                if expected == "FAIL":
                    self.assertEqual({v["rule"] for v in result["violations"]},
                                     {"bone_matrix", "painted_vertices_world", "rebuilt_vs_supplied_oracle"})
                    self.assertTrue(all(v["frame"] == 32.75 for v in result["violations"]))


if __name__ == "__main__":
    unittest.main()
