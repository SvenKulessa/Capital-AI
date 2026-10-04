alter function stripe.set_updated_at() set search_path = '';
alter function stripe.set_updated_at_metadata() set search_path = '';
alter function stripe.check_rate_limit(text, integer, integer) set search_path = '';