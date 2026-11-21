"""Fourth-fit stop: a parked hip key refused every step (contract maya-walk-motion-floor)."""
import json
from pathlib import Path
import unittest

from storybook.animation.maya_walk.fitting import (
    PoseChart, TimingChart, Objective, admit_step, StepVerdict, DAMPING_START, carry_start)
from storybook.animation.maya_walk.numerics import analytic_jacobian

FROZEN = Path(__file__).with_name('frozen-flat-stop.json')


class FrozenFlatStopTests(unittest.TestCase):
    def test_first_step_at_the_fourth_fit_stop_is_admitted(self):
        # On base 3802836 all nine attempts at these coordinates are refused
        # out_of_domain: each solved step drives the hip-height key into the
        # lowest point (a flat, unheld segment) and the curve rule refuses the
        # whole step. Under the motion floor the checkpoint is carried (only
        # parked segments change, hips lowered just enough to reach).
        fixture = json.loads(FROZEN.read_text())
        space = TimingChart(PoseChart())
        self.assertEqual([list(p) for p in space.parameters], fixture['parameters'])
        objective = Objective(space, 1., 0.)
        x, drop = carry_start(fixture, space, objective)
        self.assertGreater(drop, 0.)
        score, residuals = objective.score(x)
        self.assertIsNotNone(residuals)
        columns = analytic_jacobian(objective.score, x, residuals).require_resolved()
        update, _, receipts, _ = admit_step(objective, space, x, score, residuals, columns, DAMPING_START)
        # The carried start sits on the reach edge (smallest drop), so a long
        # first attempt may be refused by the reach guard; damping then shortens
        # it. The flat-segment wall cannot recur: parked keys are unrepresentable.
        self.assertIsNotNone(update)
        self.assertIs(receipts[-1].verdict, StepVerdict.ADMITTED)
        self.assertLess(update[1], score)


if __name__ == '__main__':
    unittest.main()
