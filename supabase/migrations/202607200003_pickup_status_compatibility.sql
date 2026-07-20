-- Some existing EcoLoop projects created pickup_status before the driver
-- workflow was introduced. Add every driver-workflow state idempotently so
-- automatic assignment can update a pending pickup to assigned.
--
-- Keep this migration outside an explicit transaction: PostgreSQL makes enum
-- additions visible only after the ALTER TYPE statement commits.
alter type public.pickup_status add value if not exists 'assigned' after 'pending';
alter type public.pickup_status add value if not exists 'arrived' after 'in_transit';
alter type public.pickup_status add value if not exists 'collected' after 'arrived';
