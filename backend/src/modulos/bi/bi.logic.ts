export const porcentaje=(parte:number,total:number)=>total ? Math.round(parte/total*1000)/10:null;
export function celdaCsv(value:unknown) {
  let text=String(value ?? ''); if(/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function comparar(actual:number|null,anterior:number|null) {return {anterior,diferencia:actual===null || anterior===null ? null:Math.round((actual-anterior)*10)/10,porcentaje:actual===null || anterior===null || anterior===0 ? null:Math.round((actual-anterior)/anterior*1000)/10};}

// Union of reservations clipped to one availability interval; overlapping rows count once.
export function minutosReservados(inicio:Date,fin:Date,citas:{fechaInicio:Date;fechaFin:Date}[]) {
  const intervals=citas.map((c)=>[Math.max(inicio.getTime(),c.fechaInicio.getTime()),Math.min(fin.getTime(),c.fechaFin.getTime())])
    .filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let total=0,last=-Infinity;
  for(const [a,b] of intervals){total+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b);}
  return total/60000;
}
