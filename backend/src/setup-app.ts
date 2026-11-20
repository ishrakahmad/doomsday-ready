import { BadRequestException, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { HttpErrorFilter } from './common/http-error.filter';

function flatten(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((e) => {
    const path = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {});
    return [...own, ...flatten(e.children ?? [], path)];
  });
}


export function setupApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ error: 'VALIDATION_ERROR', message: flatten(errors) }),
    }),
  );
  app.useGlobalFilters(new HttpErrorFilter());
  return app;
}
