import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { EstadoPago, MetodoPago } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { CatalogoQueryDto, decimalPattern } from '../../common/dto/catalogo.dto';
import { nullableText, trimText, VersionDto } from '../../common/dto/clinical-fields.dto';

export class RegistrarPagoDto {
  @ApiProperty() @IsUUID() presupuestoId!: string;
  @ApiProperty({ type: String, example: '150.00' }) @Matches(decimalPattern) monto!: string;
  @ApiProperty({ enum: MetodoPago }) @IsEnum(MetodoPago) metodoPago!: MetodoPago;
  @ApiProperty({ description: 'UUID de la operación. Reutilizar al reintentar la misma solicitud.' }) @IsUUID() claveSolicitud!: string;
  @ApiPropertyOptional({ maxLength: 100 }) @Transform(trimText) @IsOptional() @IsString() @MaxLength(100) referencia?: string;
  @ApiPropertyOptional({ maxLength: 1000 }) @Transform(nullableText) @IsOptional() @IsString() @MaxLength(1000) observaciones?: string | null;
}
export class AnularPagoDto extends VersionDto {
  @ApiProperty({ maxLength: 500 }) @Transform(trimText) @IsString() @IsNotEmpty() @MaxLength(500) motivo!: string;
}
export class BuscarPagosDto extends CatalogoQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() pacienteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() presupuestoId?: string;
  @ApiPropertyOptional({ enum: EstadoPago }) @IsOptional() @IsEnum(EstadoPago) estadoPago?: EstadoPago;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) desde?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta?: string;
}
export class CarteraQueryDto extends CatalogoQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() pacienteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() presupuestoId?: string;
  @ApiPropertyOptional({ enum: ['pendientes', 'saldados', 'todos'] }) @IsIn(['pendientes', 'saldados', 'todos']) estadoSaldo = 'pendientes';
}
export class PeriodoFinancieroDto {
  @ApiProperty({ format: 'date', description: 'Inicio incluido, hora Colombia.' }) @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) desde!: string;
  @ApiProperty({ format: 'date', description: 'Fin excluido. Máximo 366 días.' }) @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta!: string;
}
export class CorteFinancieroDto {
  @ApiProperty() @IsUUID() corte!: string;
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) pagina = 1;
}
