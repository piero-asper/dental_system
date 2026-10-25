import { Type } from 'class-transformer';
import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
export class PeriodoBiDto {
  @ApiProperty({format:'date',description:'Inicio incluido en Colombia. Máximo 366 días por consulta.'}) @IsDateString({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}$/) desde!:string;
  @ApiProperty({format:'date',description:'Fin excluido en Colombia.'}) @IsDateString({strict:true}) @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta!:string;
}
export class DetalleBiDto {
  @ApiProperty({format:'uuid',description:'Corte devuelto por resumen; expira a los cinco minutos o al reiniciar la API.'}) @IsUUID() corte!:string;
  @ApiProperty({example:'nuevos',description:'Indicador, demanda_D_H, nuevos_AAAA-MM-DD o citas_AAAA-MM-DD.'})
  @Matches(/^(nuevos|atendidos|recurrentes|programadas|confirmadas|atendidas|canceladas|inasistencias|inasistencias_iniciadas|atendidas_iniciadas|vencidas|sin_proxima|sin_historia|pendientes|no_verificables|ocupacion|demanda_[0-6]_\d{1,2}|(?:nuevos|citas)_\d{4}-\d{2}-\d{2})$/) metrica!:string;
  @ApiPropertyOptional({default:1,minimum:1,description:'Detalle: 20 filas por página. CSV: todas las filas, hasta 5000.'}) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(1000000) pagina=1;
}
