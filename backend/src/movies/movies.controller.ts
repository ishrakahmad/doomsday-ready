import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateMovieDto, UpdateMovieDto } from './movie.dto';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Post()
  create(@Body() dto: CreateMovieDto) {
    return this.movies.create(dto);
  }

  @Get()
  findAll() {
    return this.movies.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movies.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMovieDto) {
    return this.movies.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.movies.remove(id);
  }

  @Get(':id/rewatch-order')
  rewatchOrder(@Param('id', ParseIntPipe) id: number) {
    return this.movies.rewatchOrder(id);
  }
}
