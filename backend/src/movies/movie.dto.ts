import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../common/trim';

export const MIN_RELEASE_YEAR = 1888; // first known motion picture
export const MAX_RELEASE_YEAR = 2100;

export class CreateMovieDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsInt()
  @Min(MIN_RELEASE_YEAR)
  @Max(MAX_RELEASE_YEAR)
  releaseYear: number;

  @IsInt()
  @Min(1)
  @Max(300)
  runtime: number;

  @IsOptional()
  @IsBoolean()
  watched?: boolean;

  /** Ids of movies to watch first. Duplicates are ignored. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  prerequisiteIds?: number[];
}

/** Every field is optional; `prerequisiteIds`, when sent, replaces the whole list. */
export class UpdateMovieDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_RELEASE_YEAR)
  @Max(MAX_RELEASE_YEAR)
  releaseYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  runtime?: number;

  @IsOptional()
  @IsBoolean()
  watched?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  prerequisiteIds?: number[];
}

export interface MovieRef {
  id: number;
  title: string;
}

export interface MovieView {
  id: number;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: MovieRef[];
}

export interface RewatchMovie {
  id: number;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
}

export interface RewatchOrderView {
  target: MovieRef;
  movies: RewatchMovie[];
  totalCount: number;
  watchedCount: number;
  unwatchedCount: number;
  /** Total runtime, in minutes, of the movies in the list that are not watched yet. */
  unwatchedRuntime: number;
}
