import { apiClient } from '@/shared/lib/apiClient';
export type Franja={dia:number;inicio:string;fin:string};
export type Bloqueo={id:string;fechaInicio:string;fechaFin:string;motivo:string;updatedAt:string;canceladoAt:string|null};
export type Disponibilidad={configurada:boolean;intervalos:{inicio:string;fin:string}[];bloqueos:Bloqueo[];franjas:{inicio:string;fin:string}[]};
export const agendaApi={
  configuracion:()=>apiClient<{id:string;vigenteDesde:string;intervalos:Franja[]}[]>('/agenda/configuracion'),
  guardar:(vigenteDesde:string,intervalos:Franja[])=>apiClient('/agenda/configuracion',{method:'POST',body:JSON.stringify({vigenteDesde,intervalos})}),
  disponibilidad:(fecha:string,duracion=30,excluir?:string)=>apiClient<Disponibilidad>(`/agenda/disponibilidad?${new URLSearchParams({fecha,duracion:String(duracion),...(excluir?{excluir}:{})})}`),
  bloquear:(data:{fechaInicio:string;fechaFin:string;motivo:string})=>apiClient('/agenda/bloqueos',{method:'POST',body:JSON.stringify(data)}),
  cancelar:(item:Bloqueo)=>apiClient(`/agenda/bloqueos/${item.id}/cancelar`,{method:'PATCH',body:JSON.stringify({version:item.updatedAt})})
};
