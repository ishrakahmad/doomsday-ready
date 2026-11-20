import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BundleLine } from '../algorithms/bundle-quote';

export class CreateCinemaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique({ message: 'bundleSizes must not contain the same size twice' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(500, { each: true })
  bundleSizes: number[];
}

export class BookingQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  groupSize: number;
}

export interface CinemaView {
  id: number;
  name: string;
  bundleSizes: number[];
}

export interface BookingQuoteView {
  cinema: CinemaView;
  groupSize: number;
  possible: boolean;

  totalBundles: number | null;

  bundles: BundleLine[];
}