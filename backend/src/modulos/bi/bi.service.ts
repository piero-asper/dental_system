import { BadRequestException, GoneException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { fechaClinica,inicioDia,Franja,restar } from '../agenda/agenda.logic';
import { DetalleBiDto,PeriodoBiDto } from './bi.dto';
import { celdaCsv,comparar,minutosReservados,porcentaje } from './bi.logic';
type Fila={id:string;pacienteId:string;paciente:string;fecha:string|null;estado:string;tipo:string};
type Grupo={metrica:string;total:bigint;items:Fila[]};
type Corte={actor:string;expira:number;fecha:string;grupos:Record<string,Fila[]>};
@Injectable()
export class BiService {
  private cortes=new Map<string,Corte>();
  constructor(private readonly prisma:PrismaService) {}
  private consulta(desde:Date,hasta:Date,ahora:Date) {
    return Prisma.sql`WITH c AS (SELECT c.*,p.apellidos||', '||p.nombres AS paciente FROM citas c JOIN pacientes p ON p.id=c.paciente_id WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL),
    periodo AS (SELECT * FROM c WHERE fecha_inicio>=${desde} AND fecha_inicio<${hasta}),
    pacientes_atendidos AS (SELECT DISTINCT ON(paciente_id) * FROM periodo WHERE estado='ATENDIDA' ORDER BY paciente_id,fecha_inicio DESC),
    filas AS (
      SELECT 'nuevos'::text metrica,p.id,p.id paciente_id,p.apellidos||', '||p.nombres paciente,p.created_at fecha,CASE WHEN activo THEN 'Activo' ELSE 'Inactivo' END estado,'paciente'::text tipo FROM pacientes p WHERE p.deleted_at IS NULL AND p.created_at>=${desde} AND p.created_at<${hasta}
      UNION ALL SELECT 'atendidos',paciente_id,paciente_id,paciente,fecha_inicio,estado::text,'paciente' FROM pacientes_atendidos
      UNION ALL SELECT 'recurrentes',paciente_id,paciente_id,paciente,fecha_inicio,estado::text,'paciente' FROM pacientes_atendidos a WHERE EXISTS(SELECT 1 FROM c WHERE c.paciente_id=a.paciente_id AND c.estado='ATENDIDA' AND c.fecha_inicio<${desde})
      UNION ALL SELECT CASE estado WHEN 'PROGRAMADA' THEN 'programadas' WHEN 'CONFIRMADA' THEN 'confirmadas' WHEN 'ATENDIDA' THEN 'atendidas' WHEN 'CANCELADA' THEN 'canceladas' ELSE 'inasistencias' END,id,paciente_id,paciente,fecha_inicio,estado::text,'cita' FROM periodo
      UNION ALL SELECT 'vencidas',id,paciente_id,paciente,fecha_inicio,estado::text,'cita' FROM periodo WHERE estado IN('PROGRAMADA','CONFIRMADA') AND fecha_fin<${ahora}
      UNION ALL SELECT 'sin_proxima',p.id,p.id,p.apellidos||', '||p.nombres,NULL,'Activo','paciente' FROM pacientes p WHERE p.activo AND p.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM c WHERE c.paciente_id=p.id AND c.estado IN('PROGRAMADA','CONFIRMADA') AND c.fecha_inicio>${ahora})
      UNION ALL SELECT 'sin_historia',p.id,p.id,p.apellidos||', '||p.nombres,NULL,'Activo','paciente' FROM pacientes p WHERE p.activo AND p.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM historias_clinicas h WHERE h.paciente_id=p.id)
      UNION ALL SELECT 'pendientes',c.id,c.paciente_id,c.paciente,c.fecha_inicio,c.estado::text,'cita' FROM periodo c WHERE c.estado='ATENDIDA' AND EXISTS(SELECT 1 FROM cita_eventos ev WHERE ev.cita_id=c.id AND ev.accion='INSERT') AND NOT EXISTS(SELECT 1 FROM evoluciones_clinicas e WHERE e.cita_id=c.id AND e.estado='FINALIZADA')
      UNION ALL SELECT 'no_verificables',c.id,c.paciente_id,c.paciente,c.fecha_inicio,c.estado::text,'cita' FROM periodo c WHERE c.estado='ATENDIDA' AND NOT EXISTS(SELECT 1 FROM cita_eventos ev WHERE ev.cita_id=c.id AND ev.accion='INSERT') AND NOT EXISTS(SELECT 1 FROM evoluciones_clinicas e WHERE e.cita_id=c.id AND e.estado='FINALIZADA')
    ) SELECT metrica,count(*) AS total,jsonb_agg(jsonb_build_object('id',id,'pacienteId',paciente_id,'paciente',paciente,'fecha',fecha,'estado',estado,'tipo',tipo) ORDER BY fecha DESC NULLS LAST,id) items FROM (SELECT * FROM filas LIMIT 50001) f GROUP BY metrica`;
  }
  async resumen(dto:PeriodoBiDto,actor:string) {
    const desde=inicioDia(dto.desde),hasta=inicioDia(dto.hasta),ahora=new Date();
    const dias=(hasta.getTime()-desde.getTime())/86400000;
    if(dias<=0 || dias>366 || desde>ahora) throw new BadRequestException('Consulta entre 1 y 366 días, con inicio no posterior a hoy.');
    // Comparación equivalente para periodos en curso: sólo el tramo transcurrido.
    const finComparacion=new Date(Math.min(hasta.getTime(),ahora.getTime()));
    const anteriorDesde=new Date(desde.getTime()-dias*86400000),anteriorHasta=new Date(anteriorDesde.getTime()+finComparacion.getTime()-desde.getTime());
    const resultado=await this.prisma.$transaction(async(tx)=>{
      const actuales=await tx.$queryRaw<Grupo[]>(this.consulta(desde,hasta,ahora));
      const baseComparacion=await tx.$queryRaw<Grupo[]>(this.consulta(desde,finComparacion,ahora));
      const anteriores=await tx.$queryRaw<Grupo[]>(this.consulta(anteriorDesde,anteriorHasta,ahora));
      const series=await tx.$queryRaw<{fecha:string;pacientes:bigint;citas:bigint}[]>`WITH dias AS (SELECT generate_series(${desde}::timestamptz,${hasta}::timestamptz-interval '1 day',interval '1 day') d) SELECT to_char(d AT TIME ZONE 'America/Bogota','YYYY-MM-DD') fecha,(SELECT count(*) FROM pacientes p WHERE deleted_at IS NULL AND p.created_at>=d AND p.created_at<d+interval '1 day') pacientes,(SELECT count(*) FROM citas c WHERE c.deleted_at IS NULL AND EXISTS(SELECT 1 FROM pacientes p WHERE p.id=c.paciente_id AND p.deleted_at IS NULL) AND c.fecha_inicio>=d AND c.fecha_inicio<d+interval '1 day') citas FROM dias ORDER BY d`;
      const demanda=await tx.$queryRaw<{dia:number;hora:number;total:bigint;items:Fila[]}[]>`SELECT extract(dow FROM c.fecha_inicio AT TIME ZONE 'America/Bogota')::int dia,extract(hour FROM c.fecha_inicio AT TIME ZONE 'America/Bogota')::int hora,count(*) total,jsonb_agg(jsonb_build_object('id',c.id,'pacienteId',c.paciente_id,'paciente',p.apellidos||', '||p.nombres,'fecha',c.fecha_inicio,'estado',c.estado,'tipo','cita') ORDER BY c.fecha_inicio DESC,c.id) items FROM citas c JOIN pacientes p ON p.id=c.paciente_id WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL AND c.estado<>'CANCELADA' AND c.fecha_inicio>=${desde} AND c.fecha_inicio<${hasta} GROUP BY 1,2 ORDER BY 1,2`;
      const versiones=await tx.agendaVersion.findMany({orderBy:[{vigenteDesde:'desc'},{createdAt:'desc'},{id:'desc'}]});
      const bloqueos=await tx.agendaBloqueo.findMany({where:{fechaInicio:{lt:hasta},fechaFin:{gt:desde}}});
      const citas=await tx.cita.findMany({where:{deletedAt:null,paciente:{deletedAt:null},fechaInicio:{lt:hasta},fechaFin:{gt:desde},estado:{in:['PROGRAMADA','CONFIRMADA','ATENDIDA']}},include:{paciente:{select:{nombres:true,apellidos:true}}}});
      let disponibles=0,reservados=0,sinHorario=0; const ocupacion:Fila[]=[];
      for(let t=desde.getTime();t<hasta.getTime();t+=86400000){const fecha=fechaClinica(new Date(t)),dia=new Date(t).getUTCDay(); const v=versiones.find((v)=>v.vigenteDesde.toISOString().slice(0,10)<=fecha);
        if(!v){sinHorario++;continue;}
        if(v.createdAt.getTime()>t && v.createdAt.getTime()<t+86400000)sinHorario++;
        const base=(v.intervalos as unknown as Franja[]).filter((i)=>i.dia===dia).map((i)=>({inicio:new Date(Math.max(new Date(`${fecha}T${i.inicio}:00-05:00`).getTime(),v.createdAt.getTime())),fin:new Date(`${fecha}T${i.fin}:00-05:00`)})).filter((i)=>i.fin>i.inicio);
        const intervalos=restar(base,bloqueos.map((b)=>({inicio:new Date(Math.max(b.fechaInicio.getTime(),b.createdAt.getTime())),fin:new Date(Math.min(b.fechaFin.getTime(),b.canceladoAt?.getTime()??Infinity))})).filter((i)=>i.fin>i.inicio));
        for(const i of intervalos){disponibles+=(i.fin.getTime()-i.inicio.getTime())/60000;reservados+=minutosReservados(i.inicio,i.fin,citas); for(const c of citas){if(c.fechaInicio<i.fin&&c.fechaFin>i.inicio&&!ocupacion.some((r)=>r.id===c.id))ocupacion.push({id:c.id,pacienteId:c.pacienteId,paciente:`${c.paciente.apellidos}, ${c.paciente.nombres}`,fecha:c.fechaInicio.toISOString(),estado:c.estado,tipo:'cita'});}}
      }
      const proximas=await tx.cita.findMany({where:{deletedAt:null,paciente:{deletedAt:null},estado:{in:['PROGRAMADA','CONFIRMADA']},fechaInicio:{gt:ahora}},orderBy:[{fechaInicio:'asc'},{id:'asc'}],take:5,select:{id:true,pacienteId:true,fechaInicio:true,fechaFin:true,estado:true,paciente:{select:{nombres:true,apellidos:true}}}});
      return {actuales,anteriores,baseComparacion,series,demanda,disponibles,reservados,sinHorario,ocupacion,proximas};
    },{isolationLevel:'RepeatableRead',timeout:45000,maxWait:10000});
    if([resultado.actuales,resultado.anteriores,resultado.baseComparacion].some((grupos)=>grupos.reduce((n,g)=>n+Number(g.total),0)>50000))throw new BadRequestException('Demasiados registros. Reduce el periodo o utiliza filtros de módulo.');
    const grupos=Object.fromEntries(resultado.actuales.map((g)=>[g.metrica,g.items]));grupos.ocupacion=resultado.ocupacion;
    for(const r of resultado.demanda)grupos[`demanda_${r.dia}_${r.hora}`]=r.items;
    for(const r of resultado.series){grupos[`nuevos_${r.fecha}`]=(grupos.nuevos??[]).filter((i)=>i.fecha&&fechaClinica(new Date(i.fecha))===r.fecha);grupos[`citas_${r.fecha}`]=['programadas','confirmadas','atendidas','canceladas','inasistencias'].flatMap((k)=>grupos[k]??[]).filter((i)=>i.fecha&&fechaClinica(new Date(i.fecha))===r.fecha);}
    const valores=Object.fromEntries(['nuevos','atendidos','recurrentes','programadas','confirmadas','atendidas','canceladas','inasistencias','vencidas','sin_proxima','sin_historia','pendientes','no_verificables'].map((key)=>[key,grupos[key]?.length??0]));
    for(const key of ['atendidas','inasistencias'])grupos[`${key}_iniciadas`]=(grupos[key]??[]).filter((r)=>r.fecha&&new Date(r.fecha)<=ahora);
    const iniciadas=(key:string)=>grupos[`${key}_iniciadas`].length;
    const anterior=Object.fromEntries(resultado.anteriores.map((g)=>[g.metrica,Number(g.total)])),base=Object.fromEntries(resultado.baseComparacion.map((g)=>[g.metrica,Number(g.total)]));
    for(const [id,c] of this.cortes)if(c.expira<Date.now())this.cortes.delete(id);
    if(this.cortes.size>=10)this.cortes.delete(this.cortes.keys().next().value!);
    const corte=randomUUID(),actualizado=ahora.toISOString();this.cortes.set(corte,{actor,expira:Date.now()+300000,fecha:actualizado,grupos});
    return {corte,actualizado,desde:dto.desde,hasta:dto.hasta,parcial:hasta>ahora,comparacion:{desde:anteriorDesde.toISOString(),hasta:anteriorHasta.toISOString(),actualHasta:finComparacion.toISOString()},indicadores:valores,proximas:resultado.proximas,variaciones:Object.fromEntries(Object.keys(valores).filter((k)=>!k.startsWith('sin_')).map((k)=>[k,comparar(base[k]??0,anterior[k]??0)])),tasaInasistencia:porcentaje(iniciadas('inasistencias'),iniciadas('atendidas')+iniciadas('inasistencias')),tasaCancelacion:porcentaje(valores.canceladas,valores.programadas+valores.confirmadas+valores.atendidas+valores.canceladas+valores.inasistencias),ocupacion:{porcentaje:resultado.sinHorario?null:porcentaje(resultado.reservados,resultado.disponibles),minutosDisponibles:resultado.disponibles,minutosReservados:resultado.reservados,diasSinHorario:resultado.sinHorario},series:resultado.series.map((r)=>({...r,pacientes:Number(r.pacientes),citas:Number(r.citas)})),demanda:resultado.demanda.map(({items:_items,...r})=>({...r,total:Number(r.total)}))};
  }
  private datos(query:DetalleBiDto,actor:string){const item=this.cortes.get(query.corte);if(!item || item.actor!==actor || item.expira<Date.now())throw new GoneException('El corte del reporte venció. Actualiza los indicadores.');return {item,filas:item.grupos[query.metrica]??[]};}
  detalle(query:DetalleBiDto,actor:string){const {item,filas}=this.datos(query,actor);return {items:filas.slice((query.pagina-1)*20,query.pagina*20),total:filas.length,totalPaginas:Math.ceil(filas.length/20),pagina:query.pagina,actualizado:item.fecha};}
  csv(query:DetalleBiDto,actor:string){const {filas}=this.datos(query,actor);if(filas.length>5000)throw new BadRequestException('La exportación admite hasta 5000 registros. Reduce el periodo.');return '\ufeff'+[['Paciente','Fecha','Estado','Tipo'],...filas.map((r)=>[r.paciente,r.fecha??'',r.estado,r.tipo])].map((r)=>r.map(celdaCsv).join(',')).join('\r\n');}
}
