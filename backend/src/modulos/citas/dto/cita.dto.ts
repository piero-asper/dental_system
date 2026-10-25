import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoCita } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { nullableText, trimText, VersionDto } from '../../../common/dto/clinical-fields.dto';

export class AgendaDto {
  @ApiProperty({ description: 'Inicio inclusivo ISO 8601 con zona horaria.' })
  @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) desde!: string;
  @ApiProperty({ description: 'Fin exclusivo. Maximo 7 dias.' })
  @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) hasta!: string;
  @ApiPropertyOptional({ enum: EstadoCita }) @IsOptional() @IsEnum(EstadoCita) estado?: EstadoCita;
}
export class HorarioCitaDto {
  @ApiProperty() @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) fechaInicio!: string;
  @ApiProperty() @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) fechaFin!: string;
}
export class CrearCitaDto extends HorarioCitaDto {
  @ApiPropertyOptional({ description: 'UUID de la solicitud. Reutilizar sólo al reintentar el mismo contenido.' }) @IsOptional() @IsUUID() claveSolicitud?: string;
  @ApiProperty() @IsUUID() pacienteId!: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @Transform(nullableText) @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(500)
  motivo?: string | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @Transform(nullableText) @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(2000)
  notas?: string | null;
}
export class ReprogramarCitaDto extends HorarioCitaDto {
  @ApiProperty() @IsISO8601({ strict: true }) version!: string;
}
export class EditarCitaDto extends VersionDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 500 }) @Transform(nullableText) @ValidateIf((_o,v) => v !== undefined && v !== null) @IsString() @MaxLength(500) motivo?: string | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 2000 }) @Transform(nullableText) @ValidateIf((_o,v) => v !== undefined && v !== null) @IsString() @MaxLength(2000) notas?: string | null;
}
export class EstadoCitaDto extends VersionDto {
  @ApiProperty({ enum: EstadoCita }) @IsEnum(EstadoCita) estado!: EstadoCita;
  @ApiPropertyOptional({ description: 'Obligatorio para cancelar.', maxLength: 500 })
  @Transform(trimText) @ValidateIf((o, v) => o.estado === EstadoCita.CANCELADA || v !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(500) motivoCancelacion?: string;
}
