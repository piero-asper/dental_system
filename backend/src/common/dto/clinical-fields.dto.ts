import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsString, MaxLength, ValidateIf } from 'class-validator';

export const trimText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export const nullableText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value;

export class NotaDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(nullableText) @ValidateIf((_o, v) => v !== undefined && v !== null) @IsString() @MaxLength(5000)
  observaciones?: string | null;
}

export class VersionDto {
  @ApiProperty({ description: 'updatedAt recibido al consultar el registro. Evita sobrescribir cambios de otra pestaña.' })
  @IsISO8601({ strict: true })
  version!: string;
}
