import { z } from 'zod';
const text = z.string().max(2000);
const link = z
  .string()
  .url()
  .max(4000)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Link deve usar HTTPS.');
const attachment = z
  .object({ name: text, url: link, kind: z.enum(['file', 'image', 'link']), details: text })
  .strict();
const participant = z.object({ name: text, department: text, role: text, sourceId: text }).strict();
const field = z.object({ label: text, value: z.string().max(20000) }).strict();
const entry = z
  .object({
    sourceId: z.string().min(1).max(200),
    sequence: z.number().int().min(0),
    title: text,
    author: text,
    dateLabel: text,
    content: z.string().max(200000),
    participants: z.array(participant).max(1000),
    recipients: z.array(text).max(1000),
    attachments: z.array(attachment).max(1000),
    fields: z.array(field).max(1000),
    status: text,
    signature: z.string().max(20000),
    mentions: z.array(text).max(1000),
    context: z.string().max(200000),
  })
  .strict();
export const oneDocImportSchema = z
  .object({
    collectorVersion: z.literal('1.0.0'),
    source: z.literal('1doc'),
    sourceUrl: link.refine(
      (value) => new URL(value).hostname.endsWith('.1doc.com.br'),
      'Página deve pertencer ao 1Doc.',
    ),
    sourceId: z.string().min(1).max(200),
    number: z.string().min(1).max(100),
    documentType: z.string().min(1).max(100),
    title: z.string().min(1).max(500),
    description: z.string().max(200000),
    requester: text,
    sourceStatus: text,
    capturedAt: z.string().datetime(),
    externalUrl: z.union([link, z.literal('')]),
    externalCode: text,
    openedAt: text,
    participants: z.array(participant).max(1000),
    departments: z.array(text).max(1000),
    tags: z.array(text).max(1000),
    fields: z.array(field).max(1000),
    attachments: z.array(attachment).max(1000),
    signature: z.string().max(20000),
    dispatches: z.array(entry).max(1000),
    warnings: z.array(text).max(100),
  })
  .strict();
export type OneDocImport = z.infer<typeof oneDocImportSchema>;
