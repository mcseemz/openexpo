UPDATE public.role SET grants=jsonb_insert(grants, '{-1}', jsonb '"event-manage-sponsorship"', true) WHERE name='event-owner';
UPDATE public.role SET grants=jsonb_insert(grants, '{-1}', jsonb '"event-manage-sponsorship"', true) WHERE name='event-manager';
UPDATE public.role SET grants=jsonb_insert(grants, '{-1}', jsonb '"company-manage-sponsorship"', true) WHERE name='company-owner';