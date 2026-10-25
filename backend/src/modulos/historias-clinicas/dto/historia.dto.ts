import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { NotaDto, nullableText, trimText, VersionDto } from '../../../common/dto/clinical-fields.dto';

export const superficies = ['GENERAL', 'MESIAL', 'DISTAL', 'VESTIBULAR', 'LINGUAL', 'PALATINA', 'OCLUSAL', 'INCISAL'] as const;
export const estadosDentales = ['SANO', 'CARIES', 'RESTAURADO', 'AUSENTE', 'FRACTURADO', 'ENDODONCIA', 'CORONA', 'IMPLANTE', 'EXTRACCION_INDICADA'] as const;
export class CrearHistoriaDto extends NotaDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() alergiasRevisadas?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() medicamentosRevisados?: boolean;
  @ApiPropertyOptional({ nullable: true, maxLength: 5000 }) @Transform(nullableText)
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(5000) antecedentesMedicos?: string | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 5000 }) @Transform(nullableText)
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(5000) alergias?: string | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 5000 }) @Transform(nullableText)
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(5000) medicamentos?: string | null;
}
export class EditarHistoriaDto extends IntersectionType(CrearHistoriaDto, VersionDto) {}
export class CrearEvolucionDto extends NotaDto {
  @ApiPropertyOptional() @ValidateIf((o,v)=>o.estado!=='BORRADOR'||(v!==undefined&&v!=='')) @Transform(trimText) @IsString() @IsNotEmpty() @MaxLength(5000) diagnostico?: string;
  @ApiPropertyOptional() @ValidateIf((o,v)=>o.estado!=='BORRADOR'||(v!==undefined&&v!=='')) @Transform(trimText) @IsString() @IsNotEmpty() @MaxLength(5000) procedimiento?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() citaId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(52) @Matches(/^([1-4][1-8]|[5-8][1-5])$/, {each:true}) piezas?: string[];
  @ApiPropertyOptional({enum:['BORRADOR','FINALIZADA']}) @IsOptional() @IsIn(['BORRADOR','FINALIZADA']) estado?: 'BORRADOR' | 'FINALIZADA';
  @ApiPropertyOptional() @IsOptional() @Transform(trimText) @IsString() @MaxLength(500) motivoCorreccion?: string;
  @ApiPropertyOptional() @ValidateIf((_o, v) => v !== undefined) @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) fecha?: string;
}
export class EditarEvolucionDto extends IntersectionType(CrearEvolucionDto, VersionDto) {}
export class CrearPiezaDto extends NotaDto {
  @ApiProperty({ description: 'FDI permanente 11-48 o temporal 51-85.' })
  @Matches(/^([1-4][1-8]|[5-8][1-5])$/) pieza!: string;
  @ApiProperty({ enum: superficies, default: 'GENERAL' }) @IsIn(superficies) superficie: string = 'GENERAL';
  @ApiProperty({ enum: estadosDentales }) @IsIn(estadosDentales) estado!: string;
}
export class EditarPiezaDto extends VersionDto {
  @ApiProperty({ enum: estadosDentales }) @IsIn(estadosDentales) estado!: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 5000 }) @Transform(nullableText)
  @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(5000) observaciones?: string | null;
}
export class AuditoriaQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsISO8601({strict:true}) desde?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({strict:true}) hasta?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['historias_clinicas','evoluciones_clinicas','odontograma_piezas']) tabla?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^([1-4][1-8]|[5-8][1-5])$/) pieza?: string;
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) pagina = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) tamanoPagina = 20;
}
export class EvolucionesQueryDto extends AuditoriaQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['BORRADOR','FINALIZADA']) estado?: 'BORRADOR' | 'FINALIZADA';
}
