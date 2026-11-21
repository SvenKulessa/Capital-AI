"""Finance-negative and scenario tests for hypothetical pricing calculator."""
import importlib.util
from pathlib import Path
import sys
import unittest
from dataclasses import replace
from decimal import Decimal

spec = importlib.util.spec_from_file_location("unit_economics", Path(__file__).with_name("unit_economics.py"))
ue = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ue
spec.loader.exec_module(ue)


class EconomicsTests(unittest.TestCase):
    def test_60_incidents_base_and_break_even(self):
        actual = ue.calculate(ue.Assumptions())
        self.assertEqual(actual["status"], "HYPOTHESIS_ONLY")
        self.assertEqual(actual["model_usd_per_incident"], "0.30")
        self.assertEqual(actual["monthly_cogs_usd"], "42.77")
        self.assertEqual(actual["gross_margin_pct"], "71.30")
        self.assertEqual(actual["break_even_customers"], 24)

    def test_three_attempts_reduces_margin(self):
        worse = ue.calculate(replace(ue.Assumptions(), attempts_per_incident=Decimal("3")))
        self.assertEqual(worse["monthly_cogs_usd"], "60.77")
        self.assertEqual(worse["break_even_customers"], 29)

    def test_nonpositive_contribution_has_no_break_even(self):
        worse = ue.calculate(replace(ue.Assumptions(), incidents_per_customer=500))
        self.assertIsNone(worse["break_even_customers"])

    def test_reject_invalid_cost_or_volume(self):
        for a in (
            replace(ue.Assumptions(), attempts_per_incident=Decimal("0.5")),
            replace(ue.Assumptions(), price_usd=Decimal("NaN")),
            replace(ue.Assumptions(), incidents_per_customer=-1),
        ):
            with self.subTest(a=a), self.assertRaises(ValueError):
                ue.calculate(a)


if __name__ == "__main__":
    unittest.main()
