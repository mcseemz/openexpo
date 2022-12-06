UPDATE public.role SET grants=jsonb_insert(grants, '{-1}', jsonb '"event-manage-tickets"', true) WHERE name='event-owner';
UPDATE public.role SET grants=jsonb_insert(grants, '{-1}', jsonb '"event-manage-tickets"', true) WHERE name='event-manager';
