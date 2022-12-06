SELECT jsonb_insert(grants, '{-1}', jsonb '"event-manage-sponsorship"', true) FROM public.role where name='event-owner';
SELECT jsonb_insert(grants, '{-1}', jsonb '"event-manage-sponsorship"', true) FROM public.role where name='event-manager';
SELECT jsonb_insert(grants, '{-1}', jsonb '"company-manage-sponsorship"', true) FROM public.role where name='company-owner';
