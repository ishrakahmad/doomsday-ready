import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie, MoviePrerequisite } from './movie.entity';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, MoviePrerequisite])],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}