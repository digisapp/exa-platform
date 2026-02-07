-- Atomic stock reservation function to prevent race conditions
-- Reserves stock at checkout time rather than only decrementing on webhook
CREATE OR REPLACE FUNCTION reserve_stock(
  p_variant_id UUID,
  p_quantity INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INT;
BEGIN
  -- Lock the row and get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM shop_product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  -- Decrement stock atomically
  UPDATE shop_product_variants
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_variant_id;

  RETURN TRUE;
END;
$$;

-- Release reserved stock (e.g. when payment fails or order is cancelled)
CREATE OR REPLACE FUNCTION release_stock(
  p_variant_id UUID,
  p_quantity INT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE shop_product_variants
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_variant_id;
END;
$$;
