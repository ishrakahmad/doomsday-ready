import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { quoteBundles } from '../algorithms/bundle-quote';
import { BookingQuoteView, CinemaView, CreateCinemaDto } from './cinema.dto';
import { Cinema } from './cinema.entity';

@Injectable()
export class CinemasService {
  constructor(@InjectRepository(Cinema) private readonly cinemas: Repository<Cinema>) {}

  async create(dto: CreateCinemaDto): Promise<CinemaView> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name should not be empty');
    }

    
    const existing = await this.cinemas
      .createQueryBuilder('cinema')
      .where('LOWER(cinema.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'DUPLICATE_NAME',
        message: `A cinema named "${name}" already exists`,
      });
    }

    const bundleSizes = [...dto.bundleSizes].sort((a, b) => a - b);
    const cinema = await this.cinemas.save({ name, bundleSizes });
    return this.toView(cinema);
  }

  async findAll(): Promise<CinemaView[]> {
    const cinemas = await this.cinemas.find({ order: { name: 'ASC' } });
    return cinemas.map((cinema) => this.toView(cinema));
  }

  async findOne(id: number): Promise<CinemaView> {
    return this.toView(await this.getCinema(id));
  }

  async remove(id: number): Promise<void> {
    const result = await this.cinemas.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Cinema ${id} not found`);
    }
  }

  async quote(id: number, groupSize: number): Promise<BookingQuoteView> {
    const cinema = await this.getCinema(id);
    const result = quoteBundles(cinema.bundleSizes, groupSize);
    return {
      cinema: this.toView(cinema),
      groupSize,
      possible: result.possible,
      totalBundles: result.totalBundles,
      bundles: result.bundles,
    };
  }

  private async getCinema(id: number): Promise<Cinema> {
    const cinema = await this.cinemas.findOneBy({ id });
    if (!cinema) {
      throw new NotFoundException(`Cinema ${id} not found`);
    }
    return cinema;
  }

  private toView(cinema: Cinema): CinemaView {
    return { id: cinema.id, name: cinema.name, bundleSizes: cinema.bundleSizes };
  }
}