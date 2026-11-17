import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsNotEmpty, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { TipoMovimientoInventario } from '@prisma/client';
import { CatalogoDto, CatalogoQueryDto, decimalPattern } from '../../common/dto/catalogo.dto';
import { trimText, VersionDto } from '../../common/dto/clinical-fields.dto';

export class CrearInsumoDto extends CatalogoDto {
  @ApiProperty({ maxLength: 30, example: 'unidad' }) @Transform(trimText) @IsString() @IsNotEmpty() @MaxLength(30)
  unidadMedida!: string;
  @ApiPropertyOptional({ type: String, default: '0' }) @ValidateIf((_o, value) => value !== undefined) @Matches(decimalPattern) stockMinimo?: string;
}
export class EditarInsumoDto extends PartialType(CrearInsumoDto, { skipNullProperties: false }) {
  @ApiProperty() @IsISO8601({ strict: true }) version!: string;
}
export class MovimientoDto extends VersionDto {
  @ApiProperty({ enum: TipoMovimientoInventario }) @IsEnum(TipoMovimientoInventario) tipo!: TipoMovimientoInventario;
  @ApiProperty({ type: String, description: 'En entrada/salida: cantidad positiva. En ajuste: existencia final, puede ser cero.' })
  @Matches(decimalPattern) cantidad!: string;
  @ApiProperty({ maxLength: 500 }) @Transform(trimText) @IsString() @IsNotEmpty() @MaxLength(500) motivo!: string;
}
export class InventarioQueryDto extends CatalogoQueryDto {
  @ApiPropertyOptional({ enum: ['todos', 'bajo'] }) @Matches(/^(todos|bajo)$/) stock = 'todos';
}
