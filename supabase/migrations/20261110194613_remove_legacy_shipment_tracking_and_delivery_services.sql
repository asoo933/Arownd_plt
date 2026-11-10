-- Remove legacy tables unused by the current Android Native application.
-- Both tables were verified empty and have no incoming foreign keys or runtime
-- function/view dependencies. DROP TABLE without CASCADE preserves dependency safety.

drop table public.shipment_tracking;
drop table public.delivery_services;
