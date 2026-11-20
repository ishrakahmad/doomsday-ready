import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { BookingQueryDto, CreateCinemaDto } from './cinema.dto';
import { CinemasService } from './cinemas.service';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemas: CinemasService) {}

  @Post()
  create(@Body() dto: CreateCinemaDto) {
    return this.cinemas.create(dto);
  }

  @Get()
  findAll() {
    return this.cinemas.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cinemas.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cinemas.remove(id);
  }

  /** GET /api/cinemas/:id/booking?groupSize=6 */
  @Get(':id/booking')
  booking(@Param('id', ParseIntPipe) id: number, @Query() query: BookingQueryDto) {
    return this.cinemas.quote(id, query.groupSize);
  }
}
