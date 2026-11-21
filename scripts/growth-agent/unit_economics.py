"""Inspectable, hypothetical B2B Autonomous Maintainer unit economics (USD).

Not a forecast, actual invoices, vendor contract or revenue evidence.
No API calls, billing, storage mutation or paid activation.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP

MILLION = Decimal(1_000_000)
MONEY = Decimal("0.01")


@dataclass(frozen=True)
class Assumptions:
    price_usd: Decimal = Decimal("149")
    incidents_per_customer: int = 60
    input_tokens_per_attempt: int = 60_000
    output_tokens_per_attempt: int = 8_000
    attempts_per_incident: Decimal = Decimal("1.5")
    model_input_usd_per_million: Decimal = Decimal("2")
    model_output_usd_per_million: Decimal = Decimal("10")
    ci_usd_per_incident: Decimal = Decimal("0.15")
    storage_usd_per_incident: Decimal = Decimal("0.05")
    infrastructure_usd_per_customer: Decimal = Decimal("8")
    payment_fee_rate: Decimal = Decimal("0.03")
    payment_fee_fixed_usd: Decimal = Decimal("0.30")
    monthly_fixed_cost_usd: Decimal = Decimal("2500")


def calculate(a: Assumptions) -> dict:
    if (not isinstance(a.incidents_per_customer, int) or isinstance(a.incidents_per_customer, bool)
            or a.incidents_per_customer < 0 or a.incidents_per_customer > 100000
            or any(not isinstance(i, int) or i < 0 for i in
                   (a.input_tokens_per_attempt, a.output_tokens_per_attempt))):
        raise ValueError("invalid incident/token volume")
    money = (a.price_usd, a.attempts_per_incident, a.model_input_usd_per_million,
             a.model_output_usd_per_million, a.ci_usd_per_incident,
             a.storage_usd_per_incident, a.infrastructure_usd_per_customer,
             a.payment_fee_rate, a.payment_fee_fixed_usd, a.monthly_fixed_cost_usd)
    if any(not isinstance(v, Decimal) or not v.is_finite() or v < 0 for v in money):
        raise ValueError("invalid financial assumptions")
    if a.price_usd <= 0 or a.attempts_per_incident < 1 or a.payment_fee_rate >= 1:
        raise ValueError("unusable plan economics")
    tokens_per_attempt = ((Decimal(a.input_tokens_per_attempt) * a.model_input_usd_per_million
                           + Decimal(a.output_tokens_per_attempt) * a.model_output_usd_per_million) / MILLION)
    token_cost_incident = tokens_per_attempt * a.attempts_per_incident
    incident_cost = token_cost_incident + a.ci_usd_per_incident + a.storage_usd_per_incident
    processing_cost = a.price_usd * a.payment_fee_rate + a.payment_fee_fixed_usd
    cogs = (incident_cost * a.incidents_per_customer
            + a.infrastructure_usd_per_customer + processing_cost)
    contribution = a.price_usd - cogs
    customers_to_break_even = (int((a.monthly_fixed_cost_usd / contribution).to_integral_value(
        rounding=ROUND_CEILING)) if contribution > 0 else None)
    usd = lambda value: str(value.quantize(MONEY, rounding=ROUND_HALF_UP))
    return {
        "status": "HYPOTHESIS_ONLY",
        "model_usd_per_incident": usd(token_cost_incident),
        "fully_loaded_usd_per_incident": usd(incident_cost),
        "monthly_revenue_usd": usd(a.price_usd),
        "monthly_cogs_usd": usd(cogs),
        "monthly_contribution_usd": usd(contribution),
        "gross_margin_pct": str((contribution * 100 / a.price_usd).quantize(MONEY, rounding=ROUND_HALF_UP)),
        "break_even_customers": customers_to_break_even,
        "fixed_monthly_usd": usd(a.monthly_fixed_cost_usd),
    }
