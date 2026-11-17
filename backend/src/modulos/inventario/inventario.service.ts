import { Injectable } from '@nestjs/common';
import { CatalogoQueryDto } from '../../common/dto/catalogo.dto';
import { escritura } from '../../common/lib/importes';
import { CrearInsumoDto, EditarInsumoDto, InventarioQueryDto, MovimientoDto } from './inventario.dto';
import { InventarioRepository } from './inventario.repository';
@Injectable()
export class InventarioService {
  constructor(private readonly repository: InventarioRepository) {}
  private paginar<T>([items, total]: [T[], number], query: CatalogoQueryDto) {
    return { items, total, pagina: query.pagina, tamanoPagina: query.tamanoPagina, totalPaginas: Math.ceil(total / query.tamanoPagina) };
  }
  async listar(query: InventarioQueryDto) { return this.paginar(await this.repository.listar(query), query); }
  crear(dto: CrearInsumoDto) { return escritura(() => this.repository.crear(dto)); }
  editar(id: string, dto: EditarInsumoDto) { return escritura(() => this.repository.editar(id, dto)); }
  async movimientos(id: string, query: CatalogoQueryDto) { return this.paginar(await this.repository.movimientos(id, query), query); }
  movimiento(id: string, dto: MovimientoDto) { return escritura(() => this.repository.movimiento(id, dto)); }
}
