import { INestApplication, ValidationPipe } from '@nestjs/common';

export function setupApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}