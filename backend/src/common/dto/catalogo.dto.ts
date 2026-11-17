import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { nullableText, trimText } from './clinical-fields.dto';

// Importes decimales en texto: no se redondean cantidades recibidas del navegador.
export const decimalPattern = /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/;
export class CatalogoDto {
  @ApiProperty({ maxLength: 150 }) @Transform(trimText) @IsString() @IsNotEmpty() @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 }) @Transform(nullableText)
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(2000)
  descripcion?: string | null;

  @ApiPropertyOptional({ default: true }) @ValidateIf((_o, v) => v !== undefined) @IsBoolean()
  activo?: boolean;
}

export class CatalogoQueryDto {
  @ApiPropertyOptional({ maxLength: 100 }) @Transform(trimText) @IsOptional() @IsString() @MaxLength(100)
  q?: string;
  @ApiPropertyOptional({ enum: ['todos', 'activos', 'inactivos'] }) @IsIn(['todos', 'activos', 'inactivos'])
  estado = 'todos';
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000000)
  pagina = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100)
  tamanoPagina = 20;
}
