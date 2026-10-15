import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const optionalText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value;

export class CrearPacienteDto {
  @ApiProperty({ example: 'Lucia', maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'Los nombres deben ser texto.' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  @MaxLength(100, { message: 'Los nombres admiten hasta 100 caracteres.' })
  nombres!: string;

  @ApiProperty({ example: 'Torres Rojas', maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'Los apellidos deben ser texto.' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @MaxLength(100, { message: 'Los apellidos admiten hasta 100 caracteres.' })
  apellidos!: string;

  @ApiPropertyOptional({ type: String, maxLength: 30, nullable: true })
  @Transform(optionalText)
  @IsOptional()
  @Matches(/^[+\d() .-]{5,30}$/, { message: 'El telefono debe tener entre 5 y 30 caracteres de numero telefonico.' })
  telefono?: string | null;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo?: boolean;
}

export class EditarPacienteDto extends PartialType(CrearPacienteDto, { skipNullProperties: false }) {}

export class BuscarPacientesDto {
  @ApiPropertyOptional({ maxLength: 100, description: 'Nombres, apellidos o telefono. Ignora mayusculas.' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ['todos', 'activos', 'inactivos'], default: 'todos' })
  @IsIn(['todos', 'activos', 'inactivos'])
  estado: 'todos' | 'activos' | 'inactivos' = 'todos';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  pagina = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamanoPagina = 20;
}

export class PacienteResponseDto extends CrearPacienteDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ListaPacientesResponseDto {
  @ApiProperty({ type: [PacienteResponseDto] }) items!: PacienteResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() pagina!: number;
  @ApiProperty() tamanoPagina!: number;
  @ApiProperty() totalPaginas!: number;
}
