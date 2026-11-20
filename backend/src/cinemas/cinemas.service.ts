import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { quoteBundles } from '../algorithms/bundle-quote';
import { ApiError, isUniqueViolation } from '../common/api-error';
import { Cinema } from './cinema.entity';
import { BookingQuoteView, CinemaView, CreateCinemaDto } from './cinema.dto';

@Injectable()
export class CinemasService {
  constructor(@InjectRepository(Cinema) private readonly cinemas: Repository<Cinema>) {}

  async create(dto: CreateCinemaDto): Promise<CinemaView> {
    const clash = await this.cinemas
      .createQueryBuilder('c')
      .where('lower(c.name) = lower(:name)', { name: dto.name })
      .getExists();
    if (clash) throw this.duplicate(dto.name);

    try {
      const saved = await this.cinemas.save(
        this.cinemas.create({
          name: dto.name,
          bundleSizes: [...dto.bundleSizes].sort((a, b) => a - b),
        }),
      );
      return toView(saved);
    } catch (err) {
      if (isUniqueViolation(err)) throw this.duplicate(dto.name);
      throw err;
    }
  }

  async findAll(): Promise<CinemaView[]> {
    const all = await this.cinemas.find({ order: { name: 'ASC' } });
    return all.map(toView);
  }

  async findOne(id: number): Promise<CinemaView> {
    return toView(await this.get(id));
  }

  async remove(id: number): Promise<void> {
    const result = await this.cinemas.delete({ id });
    if (!result.affected) throw this.notFound(id);
  }

  async quote(id: number, groupSize: number): Promise<BookingQuoteView> {
    const cinema = await this.get(id);
    const quote = quoteBundles(cinema.bundleSizes, groupSize);
    return { cinema: toView(cinema), groupSize, ...quote };
  }

  private async get(id: number): Promise<Cinema> {
    const cinema = await this.cinemas.findOneBy({ id });
    if (!cinema) throw this.notFound(id);
    return cinema;
  }

  private notFound(id: number) {
    return new ApiError(HttpStatus.NOT_FOUND, 'CINEMA_NOT_FOUND', `Cinema ${id} not found`);
  }

  private duplicate(name: string) {
    return new ApiError(HttpStatus.CONFLICT, 'DUPLICATE_NAME', `A cinema named "${name}" already exists`);
  }
}

function toView({ id, name, bundleSizes }: Cinema): CinemaView {
  return { id, name, bundleSizes };
}
