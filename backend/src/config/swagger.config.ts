import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Sistema Dental API')
    .setDescription('API REST para gestion de clinica dental.')
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
}

