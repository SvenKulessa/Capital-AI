alter table private.external_component_inventory
  add column if not exists domain_assignments jsonb not null default '[]'::jsonb;
