import { Injectable } from '@nestjs/common';
import type { SessionUser, Source } from '@hub/types';
import { PrismaService } from '../common/prisma.service';
import { catalog } from '../resources/catalog';
import { delegate } from '../resources/resource.service';
import { canAccess } from '../resources/access';
@Injectable()
export class SearchService {
  constructor(private readonly db: PrismaService) {}
  async authorized(source: Source, user: SessionUser) {
    const name = source.href.split('/')[1];
    if (!canAccess(name, user)) return false;
    const row = await delegate(this.db, catalog[name].model).findUnique({
      where: { id: source.id },
    });
    return (
      !!row &&
      row.dataPolicy !== 'NO_AI' &&
      (name !== 'documents' || canAccess(String(row.entityType), user))
    );
  }
  async search(query: string, user: SessionUser, ai = false): Promise<Source[]> {
    const tokens = query
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 10);
    if (!tokens.length) return [];
    const output: Source[] = [];
    for (const [name, config] of Object.entries(catalog)) {
      if (!canAccess(name, user)) continue;
      const OR: Record<string, unknown>[] = tokens.flatMap((token) =>
        config.search.map((field) => ({ [field]: { contains: token, mode: 'insensitive' } })),
      );
      if (name === 'equipment')
        for (const t of tokens)
          OR.push(
            { equipmentNetwork_equipment: { is: { ip: { contains: t } } } },
            { department: { name: { contains: t, mode: 'insensitive' } } },
          );
      if (name === 'knowledge')
        for (const t of tokens)
          OR.push({
            knowledgeArticleVersion_article: {
              some: { content: { contains: t, mode: 'insensitive' } },
            },
          });
      if (name === 'specifications')
        for (const t of tokens)
          OR.push({
            specificationVersion_specification: {
              some: { content: { contains: t, mode: 'insensitive' } },
            },
          });
      if (name === 'proposals')
        for (const token of tokens)
          OR.push({
            proposalItem_proposal: {
              some: {
                OR: ['brand', 'model', 'offeredDescription'].map((field) => ({
                  [field]: { contains: token, mode: 'insensitive' },
                })),
              },
            },
          });
      if (name === 'analyses')
        for (const token of tokens)
          OR.push(
            {
              proposalItem: {
                OR: ['brand', 'model', 'offeredDescription'].map((field) => ({
                  [field]: { contains: token, mode: 'insensitive' },
                })),
              },
            },
            {
              analysisRequirementResult_analysis: {
                some: { reason: { contains: token, mode: 'insensitive' } },
              },
            },
          );
      const policy =
        ai &&
        [
          'equipment',
          'maintenance',
          'knowledge',
          'recommendations',
          'solutions',
          'acquisitions',
          'analyses',
          'documents',
        ].includes(name)
          ? { dataPolicy: { not: 'NO_AI' } }
          : {};
      const rows = await delegate(this.db, config.model).findMany({
        where: {
          ...policy,
          OR,
          ...(name === 'documents'
            ? { entityType: { in: Object.keys(catalog).filter((key) => canAccess(key, user)) } }
            : {}),
        },
        take: 8,
        include: config.include,
        orderBy: { updatedAt: 'desc' },
      });
      for (const row of rows) {
        const title = String(row[config.title] ?? row.id);
        const prefix =
          name === 'commitments'
            ? `Empenho ${title}/${row.year}`
            : name === 'knowledge'
              ? `${row.code} — ${title}`
              : title;
        const excerpt = [
          ...config.search.map((f) => row[f]).filter((v) => typeof v === 'string'),
          ...(name === 'knowledge' && Array.isArray(row.knowledgeArticleVersion_article)
            ? [(row.knowledgeArticleVersion_article[0] as { content: string } | undefined)?.content]
            : []),
        ]
          .join(' · ')
          .slice(0, 650);
        output.push({
          id: row.id,
          title: prefix,
          href: `/${name}/${row.id}`,
          kind:
            name === 'knowledge'
              ? 'official'
              : name === 'recommendations'
                ? 'recommendation'
                : name === 'maintenance'
                  ? 'case'
                  : 'document',
          excerpt,
        });
      }
    }
    return output.sort((a, b) => this.score(b, tokens) - this.score(a, tokens)).slice(0, 20);
  }
  score(source: Source, tokens: string[]) {
    return tokens.reduce(
      (score, t) =>
        score +
        (source.title.toLowerCase().includes(t.toLowerCase()) ? 4 : 0) +
        (source.excerpt.toLowerCase().includes(t.toLowerCase()) ? 1 : 0),
      0,
    );
  }
}
