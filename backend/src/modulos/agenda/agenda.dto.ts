import { Type } from 'class-transformer';
import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { VersionDto } from '../../common/dto/clinical-fields.dto';
export class FranjaDto {
  @ApiProperty({minimum:0,maximum:6,description:'Día de la semana: domingo 0, sábado 6.'}) @IsInt() @Min(0) @Max(6) dia!: number;
  @ApiProperty({example:'08:00',description:'Hora de Colombia (UTC−5).'}) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) inicio!: string;
  @ApiProperty({example:'12:00'}) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) fin!: string;
}
export class ConfigurarAgendaDto {
  @ApiProperty({format:'date',description:'Primera configuración: desde hoy. Cambios posteriores: desde mañana.'}) @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) vigenteDesde!: string;
  @ApiProperty({type:[FranjaDto],maxItems:28,description:'Las franjas ausentes son horas cerradas; una lista vacía cierra la agenda.'}) @IsArray() @ArrayMaxSize(28) @ValidateNested({ each: true }) @Type(() => FranjaDto) intervalos!: FranjaDto[];
}
export class BloqueoDto {
  @ApiProperty({format:'date-time'}) @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) fechaInicio!: string;
  @ApiProperty({format:'date-time'}) @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) fechaFin!: string;
  @ApiProperty({maxLength:500}) @IsString() @Matches(/\S/) @MaxLength(500) motivo!: string;
}
export class CancelarBloqueoDto extends VersionDto {}
export class DisponibilidadDto {
  @ApiProperty({format:'date',description:'Día de Colombia.'}) @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
  @ApiPropertyOptional({default:30,minimum:15,maximum:480}) @Type(() => Number) @IsInt() @Min(15) @Max(480) duracion = 30;
  @ApiPropertyOptional({format:'uuid',description:'Cita que se reprograma; se excluye de los cruces de esta consulta.'}) @IsOptional() @IsUUID() excluir?: string;
}
