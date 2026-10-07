import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
export function validate<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException({
      message: 'Revise os campos informados.',
      fields: result.error.flatten().fieldErrors,
    });
  return result.data;
}
export const resultSchema = z.enum(['ATENDE', 'DIVERGENCIA', 'PENDENTE']);
export function canConclude(results: string[], conclusion: string) {
  return results.length > 0 && (conclusion !== 'ATENDE' || results.every((r) => r === 'ATENDE'));
}
