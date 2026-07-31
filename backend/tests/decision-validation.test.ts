import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const denialSchema = z
  .string()
  .trim()
  .min(5)
  .max(1000);

describe('validación de observación de denegación', () => {
  it('rechaza una observación vacía', () => {
    expect(denialSchema.safeParse('  ').success).toBe(false);
  });

  it('acepta una observación clara', () => {
    expect(
      denialSchema.safeParse('El certificado no es legible.').success,
    ).toBe(true);
  });
});
