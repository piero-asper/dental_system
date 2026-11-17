ALTER TABLE pagos ADD COLUMN clave_solicitud uuid, ADD COLUMN huella_solicitud text,
  ADD COLUMN auth_user_id uuid, ADD COLUMN anulado_at timestamptz(6),
  ADD COLUMN anulado_por uuid, ADD COLUMN motivo_anulacion text;
CREATE UNIQUE INDEX pagos_clave_solicitud_key ON pagos(clave_solicitud);
CREATE INDEX pagos_presupuesto_id_estado_idx ON pagos(presupuesto_id,estado);
CREATE INDEX pagos_fecha_pago_idx ON pagos(fecha_pago);
ALTER TABLE caja_movimientos ADD COLUMN auth_user_id uuid;
CREATE UNIQUE INDEX caja_movimientos_pago_id_tipo_key ON caja_movimientos(pago_id,tipo);
CREATE TABLE secuencias_comprobantes (serie text PRIMARY KEY, ultimo_numero integer NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0));
INSERT INTO secuencias_comprobantes(serie,ultimo_numero)
  SELECT 'REC',COALESCE(MAX(substring(numero FROM '^REC-([0-9]{1,9})$')::integer),0) FROM comprobantes;

ALTER TABLE pagos ADD CONSTRAINT pagos_monto_positivo CHECK (monto > 0);
ALTER TABLE caja_movimientos ADD CONSTRAINT caja_monto_positivo CHECK (monto > 0);
ALTER TABLE comprobantes ADD CONSTRAINT comprobantes_monto_positivo CHECK (monto_total > 0);

DO $$ DECLARE tabla text; BEGIN
  FOREACH tabla IN ARRAY ARRAY['pagos','comprobantes','caja_movimientos','secuencias_comprobantes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_full_access_' || tabla, tabla);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'authenticated_read_' || tabla, tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabla);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tabla);
  END LOOP;
END $$;

CREATE FUNCTION public.proteger_movimientos_caja() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Los movimientos de caja se conservan. Una anulación se registra como una reversión nueva.'; END;
$$;
REVOKE ALL ON FUNCTION public.proteger_movimientos_caja() FROM PUBLIC;
CREATE TRIGGER caja_movimientos_inmutables BEFORE UPDATE OR DELETE ON caja_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_movimientos_caja();

CREATE FUNCTION public.proteger_pago_comprobante() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Los pagos y recibos se conservan.'; END IF;
  IF TG_TABLE_NAME = 'pagos' THEN
    IF OLD.estado <> 'REGISTRADO' OR NEW.estado <> 'ANULADO'
      OR (to_jsonb(NEW) - ARRAY['estado','updated_at','anulado_at','anulado_por','motivo_anulacion'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['estado','updated_at','anulado_at','anulado_por','motivo_anulacion'])
      OR NEW.anulado_at IS NULL OR length(trim(COALESCE(NEW.motivo_anulacion,''))) = 0
    THEN RAISE EXCEPTION 'Solo se permite anular un pago conservando sus datos y el motivo.'; END IF;
  ELSIF OLD.estado <> 'EMITIDO' OR NEW.estado <> 'ANULADO'
    OR (to_jsonb(NEW) - ARRAY['estado','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['estado','updated_at'])
  THEN RAISE EXCEPTION 'Solo se permite anular un recibo conservando sus datos.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_pago_comprobante() FROM PUBLIC;
CREATE TRIGGER pagos_conservados BEFORE UPDATE OR DELETE ON pagos FOR EACH ROW EXECUTE FUNCTION public.proteger_pago_comprobante();
CREATE TRIGGER comprobantes_conservados BEFORE UPDATE OR DELETE ON comprobantes FOR EACH ROW EXECUTE FUNCTION public.proteger_pago_comprobante();
