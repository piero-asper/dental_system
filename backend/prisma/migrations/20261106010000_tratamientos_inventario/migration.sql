-- Las escrituras de estos módulos pasan por la API, que valida importes, versiones y stock.
DO $$ DECLARE tabla text; BEGIN
  FOREACH tabla IN ARRAY ARRAY['tratamientos','presupuestos','presupuesto_items','insumos','inventario_movimientos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_full_access_' || tabla, tabla);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'authenticated_read_' || tabla, tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabla);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tabla);
  END LOOP;
END $$;

ALTER TABLE tratamientos ADD CONSTRAINT tratamientos_precio_valido CHECK (precio_base >= 0);
ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_importes_validos CHECK (
  subtotal >= 0 AND descuento >= 0 AND descuento <= subtotal AND total = subtotal - descuento);
ALTER TABLE presupuesto_items ADD CONSTRAINT presupuesto_items_importes_validos CHECK (
  cantidad BETWEEN 1 AND 9999 AND precio_unitario >= 0 AND subtotal = cantidad * precio_unitario);
ALTER TABLE insumos ADD CONSTRAINT insumos_existencias_validas CHECK (stock_actual >= 0 AND stock_minimo >= 0);
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimiento_valido CHECK (
  stock_anterior >= 0 AND stock_nuevo >= 0 AND (
    (tipo = 'ENTRADA' AND cantidad > 0 AND stock_nuevo = stock_anterior + cantidad) OR
    (tipo = 'SALIDA' AND cantidad > 0 AND stock_nuevo = stock_anterior - cantidad) OR
    (tipo = 'AJUSTE' AND cantidad >= 0 AND stock_nuevo = cantidad AND stock_nuevo <> stock_anterior)));

CREATE FUNCTION public.impedir_edicion_movimiento_inventario() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Los movimientos se conservan. Corrige las existencias mediante un nuevo ajuste con motivo.'; END;
$$;
REVOKE ALL ON FUNCTION public.impedir_edicion_movimiento_inventario() FROM PUBLIC;
CREATE TRIGGER inventario_movimientos_inmutables BEFORE UPDATE OR DELETE ON public.inventario_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.impedir_edicion_movimiento_inventario();
