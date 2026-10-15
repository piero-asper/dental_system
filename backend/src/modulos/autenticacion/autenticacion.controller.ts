import { Controller, Get, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';

class SesionResponse {
  @ApiProperty({ format: 'uuid', description: 'Identificador del usuario en Supabase Auth.' })
  authUserId!: string;

  @ApiProperty({ required: false, format: 'email' })
  email?: string;
}

@ApiTags('autenticacion')
@ApiBearerAuth()
@Controller('autenticacion')
export class AutenticacionController {
  @Get('sesion')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SesionResponse, description: 'Usuario verificado por Supabase Auth.' })
  @ApiResponse({ status: 401, description: 'Token ausente, invalido o expirado.' })
  @ApiResponse({ status: 503, description: 'Servicio de autenticacion no disponible.' })
  sesion(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
