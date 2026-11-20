import { Transform } from 'class-transformer';

/** Trims string input before validation (" Iron Man " -> "Iron Man"). */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
