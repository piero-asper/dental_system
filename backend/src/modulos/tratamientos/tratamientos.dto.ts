import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Matches, Max, Min, ValidateNested } from 'class-validator';
import { EstadoPresupuesto } from '@prisma/client';
import { CatalogoDto, CatalogoQueryDto, decimalPattern } from '../../common/dto/catalogo.dto';
import { NotaDto, VersionDto } from '../../common/dto/clinical-fields.dto';

export class CrearTratamientoDto extends CatalogoDto {
  @ApiProperty({ type: String, example: '150.00' }) @Matches(decimalPattern, { message: 'El precio debe tener hasta dos decimales.' })
  precioBase!: string;
}
export class EditarTratamientoDto extends PartialType(CrearTratamientoDto, { skipNullProperties: false }) {
  @ApiProperty() @IsISO8601({ strict: true }) version!: string;
}
export class PresupuestoItemDto extends NotaDto {
  @ApiProperty() @IsUUID() tratamientoId!: string;
  @ApiProperty({ minimum: 1, maximum: 9999 }) @IsInt() @Min(1) @Max(9999) cantidad!: number;
  @ApiProperty({ type: String, description: 'Precio acordado. Se conserva aunque cambie el catálogo.' }) @Matches(decimalPattern)
  precioUnitario!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Matches(/^([1-4][1-8]|[5-8][1-5])$/)
  pieza?: string | null;
}
export class CrearPresupuestoDto extends NotaDto {
  @ApiProperty() @IsUUID() pacienteId!: string;
  @ApiProperty({ type: [PresupuestoItemDto], maxItems: 100 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PresupuestoItemDto) items!: PresupuestoItemDto[];
  @ApiPropertyOptional({ type: String, default: '0' }) @Matches(decimalPattern) descuento = '0';
}
export class EditarPresupuestoDto extends CrearPresupuestoDto {
  @ApiProperty() @IsISO8601({ strict: true }) version!: string;
}
export class EstadoPresupuestoDto extends VersionDto {
  @ApiProperty({ enum: EstadoPresupuesto }) @IsEnum(EstadoPresupuesto) estado!: EstadoPresupuesto;
}
export class PresupuestosQueryDto extends CatalogoQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() pacienteId?: string;
  @ApiPropertyOptional({ enum: EstadoPresupuesto }) @IsOptional() @IsEnum(EstadoPresupuesto) estadoPresupuesto?: EstadoPresupuesto;
}
