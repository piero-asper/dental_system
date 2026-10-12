-- Script inicial de Row Level Security para Supabase.
-- Ejecutar despues de crear las tablas con Prisma Migrate.

alter table if exists profiles enable row level security;
alter table if exists pacientes enable row level security;
alter table if exists citas enable row level security;
alter table if exists historias_clinicas enable row level security;
alter table if exists evoluciones_clinicas enable row level security;
alter table if exists odontograma_piezas enable row level security;
alter table if exists auditoria_historias_clinicas enable row level security;
alter table if exists tratamientos enable row level security;
alter table if exists presupuestos enable row level security;
alter table if exists presupuesto_items enable row level security;
alter table if exists pagos enable row level security;
alter table if exists comprobantes enable row level security;
alter table if exists caja_movimientos enable row level security;
alter table if exists insumos enable row level security;
alter table if exists inventario_movimientos enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol::text
  from public.profiles
  where auth_user_id = auth.uid()
    and activo = true
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'ADMINISTRADOR', false)
$$;

create policy "profiles_select_own_or_admin"
on profiles for select
to authenticated
using (auth_user_id = auth.uid() or public.is_admin());

create policy "admin_full_profiles"
on profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated_read_operational_tables"
on pacientes for select
to authenticated
using (public.current_profile_role() in ('ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'));

create policy "authenticated_read_citas"
on citas for select
to authenticated
using (public.current_profile_role() in ('ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'));

create policy "clinical_read"
on historias_clinicas for select
to authenticated
using (public.current_profile_role() in ('ADMINISTRADOR', 'ODONTOLOGO'));

create policy "clinical_write"
on historias_clinicas for all
to authenticated
using (public.current_profile_role() in ('ADMINISTRADOR', 'ODONTOLOGO'))
with check (public.current_profile_role() in ('ADMINISTRADOR', 'ODONTOLOGO'));

