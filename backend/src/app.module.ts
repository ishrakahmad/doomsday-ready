import { Controller, Get, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cinema } from './cinemas/cinema.entity';
import { CinemasModule } from './cinemas/cinemas.module';
import { InitialSchema1732100000000 } from './database/migrations/1732100000000-InitialSchema';
import { SeedOnStart } from './database/seed';
import { Movie, MoviePrerequisite } from './movies/movie.entity';
import { MoviesModule } from './movies/movies.module';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL ?? 'postgres://doomsday:doomsday@localhost:5432/doomsday',
      entities: [Movie, MoviePrerequisite, Cinema],
      migrations: [InitialSchema1732100000000],
      migrationsRun: true, // schema is created
      synchronize: false,
    }),
    MoviesModule,
    CinemasModule,
  ],
  controllers: [HealthController],
  providers: [SeedOnStart],
})
export class AppModule {}
