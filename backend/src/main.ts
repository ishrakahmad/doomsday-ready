import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedSampleData } from './database/seed';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();

 
  if (process.env.SEED_ON_START === 'true') {
    await seedSampleData(app.get(DataSource));
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}

bootstrap();