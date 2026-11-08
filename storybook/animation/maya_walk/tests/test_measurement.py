"""Anatomical sign calibration independent of Blender and authored gait."""
import unittest

from storybook.animation.maya_walk.sample_scene import ankle_dorsiflexion, weights_at


class MeasurementTests(unittest.TestCase):
    def test_forward_tibia_over_flat_foot_is_dorsiflexion(self):
        # A forward knee makes the distal shin vector point backward from down.
        self.assertAlmostEqual(ankle_dorsiflexion(0., -10.), 10.)

    def test_joint_angle_is_relative_not_world_foot_pitch(self):
        self.assertAlmostEqual(ankle_dorsiflexion(0., 10.), -10.)
        self.assertAlmostEqual(ankle_dorsiflexion(20., 0.), 20.)
        self.assertAlmostEqual(ankle_dorsiflexion(-20., 0.), -20.)
        self.assertAlmostEqual(ankle_dorsiflexion(30., 30.), 0.)

    def test_uv_lookup_both_sides_and_degenerate(self):
        triangle = ((0., 0.), (1., 0.), (0., 1.))
        self.assertEqual(weights_at((.25, .25), *triangle), (.5, .25, .25))
        self.assertIsNone(weights_at((2., 2.), *triangle))
        self.assertIsNone(weights_at((0., 0.), *((0., 0.),)*3))


if __name__ == "__main__":
    unittest.main()
