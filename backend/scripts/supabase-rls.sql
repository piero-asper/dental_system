-- Ejecutar despues de Prisma Migrate. Se puede repetir sin duplicar politicas.
-- Usuario unico: negocio con lectura/escritura; datos clinicos con lectura directa.
-- Las escrituras clinicas pasan por el backend para identificar al responsable.
DO $$
DECLARE tabla text; clinica boolean;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['pacientes','citas','historias_clinicas','evoluciones_clinicas',
    'odontograma_piezas','auditoria_historias_clinicas','tratamientos','presupuestos',
    'presupuesto_items','pagos','comprobantes','caja_movimientos','insumos','inventario_movimientos','agenda_versiones','agenda_bloqueos','cita_eventos'] LOOP
    clinica := tabla IN ('historias_clinicas','evoluciones_clinicas','odontograma_piezas','auditoria_historias_clinicas','agenda_versiones','agenda_bloqueos','cita_eventos');
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_full_access_' || tabla, tabla);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated_read_' || tabla, tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabla);
    IF clinica THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'authenticated_read_' || tabla, tabla);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tabla);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', 'authenticated_full_access_' || tabla, tabla);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tabla);
    END IF;
  END LOOP;
END $$;
