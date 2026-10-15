import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BuscarPacientesDto } from './dto/paciente.dto';
import { PacientesService } from './pacientes.service';
import { PacientesRepository } from './pacientes.repository';

describe('PacientesService', () => {
  const paciente = { id: 'e63a8a72-b348-4324-9d8f-72fdbf5f25a6',
    nombres: 'Lucia', apellidos: 'Torres', telefono: null,
    activo: true, createdAt: new Date(), updatedAt: new Date() };
  let service: PacientesService;
  let repository: { listar: jest.Mock; buscarPorId: jest.Mock; crear: jest.Mock; editar: jest.Mock };
  beforeEach(() => {
    repository = { listar: jest.fn(), buscarPorId: jest.fn(), crear: jest.fn(), editar: jest.fn() };
    service = new PacientesService(repository as unknown as PacientesRepository);
  });

  it('registra solo nombres y apellidos sin exigir documento ni contacto', async () => {
    repository.crear.mockResolvedValue(paciente);
    const result = await service.crear({ nombres: 'Lucia', apellidos: 'Torres' });
    expect(repository.crear).toHaveBeenCalledWith({ tipoDocumento: 'SIN_DOCUMENTO', nombres: 'Lucia', apellidos: 'Torres' });
    expect(result).not.toHaveProperty('numeroDocumento');
  });

  it('no modifica datos omitidos en un PATCH', async () => {
    repository.editar.mockResolvedValue(paciente);
    await service.editar(paciente.id, { nombres: 'Nuevo nombre' });
    expect(repository.editar).toHaveBeenCalledWith(paciente.id, { nombres: 'Nuevo nombre' });
  });

  it('permite limpiar un dato opcional explicitamente', async () => {
    repository.editar.mockResolvedValue({ ...paciente, telefono: null });
    await service.editar(paciente.id, { telefono: null });
    expect(repository.editar).toHaveBeenCalledWith(paciente.id, { telefono: null });
  });

  it('devuelve 404 para fichas ausentes o eliminadas', async () => {
    repository.buscarPorId.mockResolvedValue(null);
    await expect(service.obtener(paciente.id)).rejects.toBeInstanceOf(NotFoundException);
    repository.editar.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: '6' }));
    await expect(service.editar(paciente.id, { activo: false })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza actualizaciones vacias', async () => {
    await expect(service.editar(paciente.id, {})).rejects.toThrow('Incluye al menos un dato');
    expect(repository.editar).not.toHaveBeenCalled();
  });

  it('devuelve totales y paginas desde el repositorio', async () => {
    repository.listar.mockResolvedValue({ items: [paciente], total: 41 });
    const result = await service.listar(Object.assign(new BuscarPacientesDto(), { pagina: 2, tamanoPagina: 20 }));
    expect(result).toMatchObject({ pagina: 2, tamanoPagina: 20, total: 41, totalPaginas: 3 });
  });
});
