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
import { Trim } from '../common/trim';

export class CreateCinemaDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** 1–10 different sizes, each 1–500 seats. */
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
  /** Fewest bundles that add up to exactly groupSize; null when not possible. */
  totalBundles: number | null;
  /** How many of each size to buy, largest size first. Empty when not possible. */
  bundles: BundleLine[];
}
