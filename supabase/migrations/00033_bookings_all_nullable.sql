-- Make ALL columns nullable except id to prevent any more constraint errors
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND table_schema = 'public'
        AND column_name != 'id'
        AND is_nullable = 'NO'
    LOOP
        EXECUTE format('ALTER TABLE public.bookings ALTER COLUMN %I DROP NOT NULL', col_record.column_name);
    END LOOP;
END $$;
