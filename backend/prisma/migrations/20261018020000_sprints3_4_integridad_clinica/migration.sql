-- Agenda unica. Los intervalos contiguos estan permitidos; los solapados no.
ALTER TABLE public.citas ADD CONSTRAINT citas_intervalo_valido CHECK (fecha_fin > fecha_inicio);
ALTER TABLE public.citas ADD CONSTRAINT citas_sin_cruces
  EXCLUDE USING gist (tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&)
  WHERE (deleted_at IS NULL AND estado IN ('PROGRAMADA', 'CONFIRMADA', 'ATENDIDA'));

ALTER TABLE public.auditoria_historias_clinicas ADD COLUMN auth_user_id uuid;
CREATE UNIQUE INDEX odontograma_pieza_superficie_unica
  ON public.odontograma_piezas (historia_clinica_id, pieza, COALESCE(superficie, 'GENERAL'));
ALTER TABLE public.odontograma_piezas ADD CONSTRAINT odontograma_fdi_valido
  CHECK (pieza ~ '^([1-4][1-8]|[5-8][1-5])$');
ALTER TABLE public.odontograma_piezas ADD CONSTRAINT odontograma_superficie_valida
  CHECK (superficie IS NULL OR superficie IN ('GENERAL', 'MESIAL', 'DISTAL', 'VESTIBULAR', 'LINGUAL', 'PALATINA', 'OCLUSAL', 'INCISAL'));

-- La auditoria se genera en la misma transaccion incluso ante escrituras fuera del API.
CREATE FUNCTION public.auditar_cambio_clinico() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE historia_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'historias_clinicas' THEN historia_id := NEW.id;
  ELSE historia_id := NEW.historia_clinica_id;
  END IF;
  INSERT INTO public.auditoria_historias_clinicas
    (id, historia_clinica_id, accion, tabla_afectada, registro_id, auth_user_id, valor_anterior, valor_nuevo, created_at)
  VALUES (gen_random_uuid(), historia_id, TG_OP, TG_TABLE_NAME, NEW.id,
    COALESCE(NULLIF(current_setting('app.auth_user_id', true), '')::uuid, auth.uid()),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW), now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.auditar_cambio_clinico() FROM PUBLIC;
CREATE TRIGGER historias_auditoria AFTER INSERT OR UPDATE ON public.historias_clinicas
  FOR EACH ROW EXECUTE FUNCTION public.auditar_cambio_clinico();
CREATE TRIGGER evoluciones_auditoria AFTER INSERT OR UPDATE ON public.evoluciones_clinicas
  FOR EACH ROW EXECUTE FUNCTION public.auditar_cambio_clinico();
CREATE TRIGGER odontograma_auditoria AFTER INSERT OR UPDATE ON public.odontograma_piezas
  FOR EACH ROW EXECUTE FUNCTION public.auditar_cambio_clinico();

CREATE FUNCTION public.impedir_borrado_clinico() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Los registros clinicos y su auditoria no se eliminan ni se altera la auditoria.'; END;
$$;
REVOKE ALL ON FUNCTION public.impedir_borrado_clinico() FROM PUBLIC;
CREATE TRIGGER historias_no_borrar BEFORE DELETE ON public.historias_clinicas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_borrado_clinico();
CREATE TRIGGER evoluciones_no_borrar BEFORE DELETE ON public.evoluciones_clinicas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_borrado_clinico();
CREATE TRIGGER odontograma_no_borrar BEFORE DELETE ON public.odontograma_piezas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_borrado_clinico();
CREATE TRIGGER auditoria_inmutable BEFORE UPDATE OR DELETE ON public.auditoria_historias_clinicas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_borrado_clinico();

-- Escrituras clinicas solo mediante el backend autenticado y auditado.
DO $$ DECLARE tabla text; BEGIN
  FOREACH tabla IN ARRAY ARRAY['historias_clinicas','evoluciones_clinicas','odontograma_piezas','auditoria_historias_clinicas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_full_access_' || tabla, tabla);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'authenticated_read_' || tabla, tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabla);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tabla);
  END LOOP;
END $$;
