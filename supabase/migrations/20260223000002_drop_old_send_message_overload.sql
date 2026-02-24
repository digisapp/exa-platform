-- Drop the old 7-parameter overload of send_message_with_coins that lacks p_media_price.
-- The 8-parameter version (with p_media_price DEFAULT NULL) is the canonical one.
-- Having both causes PostgREST to error with "could not choose the best candidate function".

DROP FUNCTION IF EXISTS public.send_message_with_coins(
  uuid, uuid, uuid, text, text, text, integer
);
