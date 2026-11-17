import { Injectable } from '@nestjs/common';
import { CatalogoQueryDto } from '../../common/dto/catalogo.dto';
import { escritura } from '../../common/lib/importes';
import { TratamientosRepository } from './tratamientos.repository';
import { CrearPresupuestoDto, CrearTratamientoDto, EditarPresupuestoDto, EditarTratamientoDto, EstadoPresupuestoDto, PresupuestosQueryDto } from './tratamientos.dto';

@Injectable()
export class TratamientosService {
  constructor(private readonly repository: TratamientosRepository) {}
  private paginar<T>([items, total]: [T[], number], query: CatalogoQueryDto) {
    return { items, total, pagina: query.pagina, tamanoPagina: query.tamanoPagina, totalPaginas: Math.ceil(total / query.tamanoPagina) };
  }
  async listar(query: CatalogoQueryDto) { return this.paginar(await this.repository.listar(query), query); }
  crear(dto: CrearTratamientoDto) { return escritura(() => this.repository.crear(dto)); }
  editar(id: string, dto: EditarTratamientoDto) { return escritura(() => this.repository.editar(id, dto)); }
  async presupuestos(query: PresupuestosQueryDto) { return this.paginar(await this.repository.listarPresupuestos(query), query); }
  presupuesto(id: string) { return this.repository.obtenerPresupuesto(id); }
  crearPresupuesto(dto: CrearPresupuestoDto) { return escritura(() => this.repository.guardarPresupuesto(dto)); }
  editarPresupuesto(id: string, dto: EditarPresupuestoDto) { return escritura(() => this.repository.guardarPresupuesto(dto, id)); }
  estado(id: string, dto: EstadoPresupuestoDto) { return escritura(() => this.repository.estadoPresupuesto(id, dto)); }
}
