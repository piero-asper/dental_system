import { celdaCsv,comparar,porcentaje } from './bi.logic';
import { restar } from '../agenda/agenda.logic';
describe('Reglas analíticas y exportación',()=>{
  it('distingue falta de denominador de un porcentaje cero',()=>{expect(porcentaje(0,0)).toBeNull();expect(porcentaje(0,5)).toBe(0);expect(porcentaje(1,3)).toBe(33.3);});
  it('no inventa crecimiento porcentual sobre una base cero',()=>{expect(comparar(5,0)).toEqual({anterior:0,diferencia:5,porcentaje:null});expect(comparar(null,5).diferencia).toBeNull();});
  it.each(['=SUM(A1)',' +cmd','\t@formula','-1+2','\n=1'])('neutraliza fórmulas CSV: %s',(value)=>expect(celdaCsv(value).startsWith('"\'')).toBe(true));
  it('escapa comillas y conserva los saltos dentro de una celda CSV',()=>expect(celdaCsv('Ana "A"\nApellido')).toBe('"Ana ""A""\nApellido"'));
  it('resta bloqueos solapados sin descontarlos dos veces',()=>{const d=(n:number)=>new Date(n*60000);const libres=restar([{inicio:d(0),fin:d(120)}],[{inicio:d(20),fin:d(60)},{inicio:d(40),fin:d(90)}]);expect(libres.map((i)=>[i.inicio.getTime()/60000,i.fin.getTime()/60000])).toEqual([[0,20],[90,120]]);});
});
