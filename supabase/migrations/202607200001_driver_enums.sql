-- Enum values are committed separately because PostgreSQL does not allow a new
-- enum value to be used by later statements in the same transaction.
alter type public.app_role add value if not exists 'driver' after 'recycler';
alter type public.pickup_status add value if not exists 'arrived' after 'in_transit';
alter type public.pickup_status add value if not exists 'collected' after 'arrived';
