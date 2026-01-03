-- Make all potentially problematic columns nullable
ALTER TABLE public.bookings ALTER COLUMN rate_type DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN booking_type DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN service_type DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN quoted_rate DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN total_amount DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN event_date DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN model_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN client_id DROP NOT NULL;
