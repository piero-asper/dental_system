-- Ampliación aditiva. Se preservan todos los registros y auditorías anteriores.
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE public.citas ADD COLUMN clave_solicitud uuid, ADD COLUMN huella_solicitud text;
CREATE UNIQUE INDEX citas_clave_solicitud_key ON public.citas(clave_solicitud);
ALTER TABLE public.historias_clinicas ADD COLUMN alergias_revisadas boolean NOT NULL DEFAULT false,
  ADD COLUMN medicamentos_revisados boolean NOT NULL DEFAULT false;
-- Los registros existentes son evoluciones documentadas; no se asocian a citas automáticamente.
ALTER TABLE public.evoluciones_clinicas ADD COLUMN cita_id uuid REFERENCES public.citas(id),
  ADD COLUMN piezas text[] NOT NULL DEFAULT '{}', ADD COLUMN estado text NOT NULL DEFAULT 'FINALIZADA',
  ADD COLUMN motivo_correccion text;
ALTER TABLE public.evoluciones_clinicas ADD CONSTRAINT evolucion_estado CHECK (estado IN ('BORRADOR','FINALIZADA'));
CREATE INDEX evoluciones_cita_idx ON public.evoluciones_clinicas(cita_id);
CREATE INDEX evoluciones_historia_fecha_idx ON public.evoluciones_clinicas(historia_clinica_id,fecha DESC);
CREATE TABLE public.agenda_versiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vigente_desde date NOT NULL,
  intervalos jsonb NOT NULL, auth_user_id uuid, created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX agenda_version_fecha_idx ON public.agenda_versiones(vigente_desde,created_at);
CREATE TABLE public.agenda_bloqueos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), fecha_inicio timestamptz(6) NOT NULL,
  fecha_fin timestamptz(6) NOT NULL, motivo text NOT NULL, auth_user_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT now(), cancelado_at timestamptz(6), updated_at timestamptz(6) NOT NULL,
  CONSTRAINT bloqueo_intervalo CHECK(fecha_fin > fecha_inicio)
);
CREATE INDEX agenda_bloqueo_fecha_idx ON public.agenda_bloqueos(fecha_inicio,fecha_fin);
CREATE TABLE public.cita_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cita_id uuid NOT NULL REFERENCES public.citas(id),
  auth_user_id uuid, accion text NOT NULL, valor_anterior jsonb, valor_nuevo jsonb NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX cita_eventos_cita_fecha_idx ON public.cita_eventos(cita_id,created_at);
CREATE FUNCTION public.auditar_cita() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, public AS $$ BEGIN
  INSERT INTO public.cita_eventos(cita_id,auth_user_id,accion,valor_anterior,valor_nuevo)
    VALUES(NEW.id,COALESCE(NULLIF(current_setting('app.auth_user_id',true),'')::uuid,auth.uid()),TG_OP,
      CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.auditar_cita() FROM PUBLIC;
CREATE TRIGGER citas_auditoria AFTER INSERT OR UPDATE ON public.citas FOR EACH ROW EXECUTE FUNCTION public.auditar_cita();
CREATE TRIGGER cita_eventos_inmutables BEFORE UPDATE OR DELETE ON public.cita_eventos FOR EACH ROW EXECUTE FUNCTION public.impedir_borrado_clinico();
CREATE TRIGGER agenda_version_inmutable BEFORE UPDATE OR DELETE ON public.agenda_versiones FOR EACH ROW EXECUTE FUNCTION public.impedir_borrado_clinico();
-- Integridad también para escrituras fuera de la API.
CREATE FUNCTION public.validar_evolucion() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.cita_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.citas c JOIN public.historias_clinicas h ON h.paciente_id=c.paciente_id WHERE c.id=NEW.cita_id AND h.id=NEW.historia_clinica_id AND c.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'La cita y la historia deben pertenecer al mismo paciente.';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(NEW.piezas) p WHERE p !~ '^([1-4][1-8]|[5-8][1-5])$') THEN RAISE EXCEPTION 'Piezas FDI inválidas.'; END IF;
  IF NEW.estado='FINALIZADA' AND (COALESCE(btrim(NEW.diagnostico),'')='' OR COALESCE(btrim(NEW.procedimiento),'')='') THEN RAISE EXCEPTION 'Completa diagnóstico y procedimiento.'; END IF;
  IF TG_OP='UPDATE' AND OLD.estado='FINALIZADA' THEN
    IF NEW.estado <> 'FINALIZADA' OR COALESCE(btrim(NEW.motivo_correccion),'')='' THEN RAISE EXCEPTION 'Una corrección finalizada requiere motivo y no vuelve a borrador.'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validar_evolucion() FROM PUBLIC;
CREATE TRIGGER evolucion_integridad BEFORE INSERT OR UPDATE ON public.evoluciones_clinicas FOR EACH ROW EXECUTE FUNCTION public.validar_evolucion();
DO $$ DECLARE tabla text; BEGIN
  FOREACH tabla IN ARRAY ARRAY['agenda_versiones','agenda_bloqueos','cita_eventos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',tabla);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING(true)','authenticated_read_'||tabla,tabla);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',tabla);
  END LOOP;
END $$;
COMMIT;
