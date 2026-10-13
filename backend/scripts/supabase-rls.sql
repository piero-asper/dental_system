-- Script inicial de Row Level Security para Supabase.
-- Ejecutar despues de crear las tablas con Prisma Migrate.
-- Sistema de usuario unico: cualquier usuario autenticado puede leer y escribir.

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

create policy "authenticated_full_access_pacientes"
on pacientes for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_citas"
on citas for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_historias_clinicas"
on historias_clinicas for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_evoluciones_clinicas"
on evoluciones_clinicas for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_odontograma_piezas"
on odontograma_piezas for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_auditoria_historias_clinicas"
on auditoria_historias_clinicas for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_tratamientos"
on tratamientos for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_presupuestos"
on presupuestos for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_presupuesto_items"
on presupuesto_items for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_pagos"
on pagos for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_comprobantes"
on comprobantes for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_caja_movimientos"
on caja_movimientos for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_insumos"
on insumos for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_inventario_movimientos"
on inventario_movimientos for all
to authenticated
using (true)
with check (true);

