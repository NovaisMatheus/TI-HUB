import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { validate } from '../common/validation';

const uploadSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    dataBase64: z
      .string()
      .min(1)
      .max(11184812)
      .regex(/^[A-Za-z0-9+/]*={0,2}$/),
  })
  .strict();
export type Extracted = { text: string; status: string; mimeType: string };
export function extractDocument(data: Uint8Array, name: string): Promise<Extracted> {
  return new Promise((resolve) => {
    // Native PDF libraries must not share the API process's lifetime or native handles.
    const worker = fork(join(__dirname, 'document-worker.js'), [], {
      execArgv: ['--max-old-space-size=256'],
      silent: true,
      serialization: 'advanced',
    });
    let done = false;
    const finish = (result: Extracted) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      worker.kill();
      resolve(result);
    };
    const failure = () =>
      finish({ text: '', status: 'FALHA', mimeType: 'application/octet-stream' });
    const timer = setTimeout(failure, 30000);
    worker.once('message', finish);
    worker.once('error', failure);
    worker.once('exit', failure);
    worker.stdout?.resume();
    worker.stderr?.resume();
    worker.send({ data, name }, (error) => {
      if (error) failure();
    });
  });
}
@Injectable()
export class DocumentService {
  constructor(private readonly db: PrismaService) {}
  async upload(input: unknown, userId: string) {
    const value = validate(uploadSchema, input);
    const data = Buffer.from(value.dataBase64, 'base64');
    if (
      !data.length ||
      data.length > 8 * 1024 * 1024 ||
      data.toString('base64') !== value.dataBase64
    )
      throw new BadRequestException('Envie um arquivo válido de até 8 MB.');
    const id = createHash('sha256').update(userId).update(data).digest('hex');
    let file = await this.db.documentFile.findUnique({ where: { id } });
    if (!file) {
      const result = await extractDocument(data, value.name);
      file = await this.db.documentFile.upsert({
        where: { id },
        update: {},
        create: {
          id,
          userId,
          name: value.name,
          size: data.length,
          data,
          mimeType: result.mimeType,
          extractedText: result.text,
          extractionStatus: result.status,
        },
      });
    }
    return { fileId: file.id, extractionStatus: file.extractionStatus, size: file.size };
  }
}
