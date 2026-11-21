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

    def test_budget_is_optional_and_binds_unrounded_cogs(self):
        self.assertEqual(ue.calculate(ue.Assumptions())["hypothetical_budget_status"], "NOT_CONFIGURED")
        for limit, expected in (("42.76", "EXCEEDS_BUDGET"), ("42.77", "WITHIN_BUDGET"),
                                ("42.78", "WITHIN_BUDGET")):
            with self.subTest(limit=limit):
                actual = ue.calculate(replace(ue.Assumptions(), monthly_cogs_budget_usd=Decimal(limit)))
                self.assertEqual(actual["hypothetical_budget_status"], expected)
        rounded_overrun = ue.calculate(replace(ue.Assumptions(),
                model_input_usd_per_million=Decimal("2.00001"),
                monthly_cogs_budget_usd=Decimal("42.77")))
        self.assertEqual(rounded_overrun["monthly_cogs_usd"], "42.77")
        self.assertEqual(rounded_overrun["hypothetical_budget_status"], "EXCEEDS_BUDGET")

    def test_reject_ambiguous_or_unbounded_assumptions(self):
        cases = (
            replace(ue.Assumptions(), input_tokens_per_attempt=True),
            replace(ue.Assumptions(), output_tokens_per_attempt=False),
            replace(ue.Assumptions(), input_tokens_per_attempt=10_000_001),
            replace(ue.Assumptions(), attempts_per_incident=Decimal("101")),
            replace(ue.Assumptions(), price_usd=Decimal("0.00001")),
            replace(ue.Assumptions(), model_input_usd_per_million=Decimal("1e99")),
            replace(ue.Assumptions(), monthly_cogs_budget_usd=True),
            replace(ue.Assumptions(), monthly_cogs_budget_usd=Decimal("NaN")),
            replace(ue.Assumptions(), monthly_cogs_budget_usd=Decimal("Infinity")),
            replace(ue.Assumptions(), monthly_cogs_budget_usd=Decimal("-0.01")),
        )
        for case in cases:
            with self.subTest(case=case), self.assertRaises(ValueError):
                ue.calculate(case)

if __name__ == "__main__":
    unittest.main()
