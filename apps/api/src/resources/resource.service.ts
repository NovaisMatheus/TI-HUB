import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SessionUser } from '@hub/types';
import { PrismaService } from '../common/prisma.service';
import { catalog, Resource, resourceSchema } from './catalog';
import { validate } from '../common/validation';
import { RecordHooks } from './record-hooks';
import { canAccess } from './access';
export interface Row {
  id: string;
  [key: string]: unknown;
}
export interface Delegate {
  findMany(args: Record<string, unknown>): Promise<Row[]>;
  findUnique(args: Record<string, unknown>): Promise<Row | null>;
  count(args: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<Row>;
  update(args: Record<string, unknown>): Promise<Row>;
}
export function delegate(db: Prisma.TransactionClient, model: string): Delegate {
  return (db as unknown as Record<string, Delegate>)[model];
}
export const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class ResourceService {
  constructor(
    private readonly db: PrismaService,
    private readonly hooks: RecordHooks,
  ) {}
  config(name: string, user: SessionUser, write = false): Resource {
    const config = catalog[name];
    if (!config) throw new NotFoundException('Módulo não encontrado.');
    if (!canAccess(name, user, write)) throw new ForbiddenException('Acesso não permitido.');
    return config;
  }
  async list(name: string, user: SessionUser, query: Record<string, string>) {
    const config = this.config(name, user);
    const page = Math.min(100000, Math.max(1, Math.floor(Number(query.page) || 1))),
      pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize) || 15)));
    const q = (query.q ?? '').slice(0, 200);
    const where: Record<string, unknown> = q
      ? {
          OR: [...new Set([...config.search, config.title])].map((field) => ({
            [field]: { contains: q, mode: 'insensitive' },
          })),
        }
      : {};
    if (name === 'documents')
      where.entityType = { in: Object.keys(catalog).filter((key) => canAccess(key, user)) };
    if (query.status && config.fields.some((f) => f.name === 'status')) where.status = query.status;
    if (q && name === 'equipment')
      (where.OR as unknown[]).push(
        { equipmentNetwork_equipment: { is: { ip: { contains: q } } } },
        { department: { name: { contains: q, mode: 'insensitive' } } },
      );
    const sort = [
      ...config.fields.filter((f) => !f.ref).map((f) => f.name),
      'createdAt',
      'date',
      'occurredAt',
    ]
      .filter((f) => config.columns.includes(f) || f === 'createdAt')
      .includes(query.sort)
      ? query.sort
      : 'createdAt';
    const model = delegate(this.db, config.model);
    const [items, total] = await Promise.all([
      model.findMany({
        where,
        include: config.include,
        orderBy: { [sort]: query.direction === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      model.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
  async get(name: string, id: string, user: SessionUser) {
    const config = this.config(name, user);
    const item = await delegate(this.db, config.model).findUnique({
      where: { id },
      include: config.include,
    });
    if (!item) throw new NotFoundException('Registro não encontrado.');
    if (name === 'documents' && !canAccess(String(item.entityType), user))
      throw new ForbiddenException('Documento vinculado a módulo não autorizado.');
    const documents = user.permissions.includes('documents.read')
      ? await this.db.documentReference.findMany({ where: { entityType: name, entityId: id } })
      : [];
    let related: Record<string, unknown> = {};
    if (name === 'equipment' && user.permissions.includes('maintenance.read'))
      related = {
        history: await this.db.maintenanceRecord.findMany({
          where: { equipmentId: id },
          include: { technician: { select: { name: true } } },
          orderBy: { occurredAt: 'desc' },
        }),
      };
    if (name === 'acquisitions')
      related = {
        timeline: await this.db.timelineEvent.findMany({
          where: { processId: id },
          include: { supplier: true, user: { select: { name: true } } },
          orderBy: { occurredAt: 'asc' },
        }),
        proposals: await this.db.proposal.findMany({
          where: { processId: id },
          include: { supplier: true, proposalItem_proposal: true },
        }),
        analyses: user.permissions.includes('analysis.read')
          ? await this.db.technicalAnalysis.findMany({
              where: { processId: id },
              include: { proposalItem: true },
            })
          : [],
        commitments: await this.db.commitment.findMany({
          where: { processId: id },
          include: { supplier: true },
        }),
        inspections: user.permissions.includes('inspection.read')
          ? await this.db.technicalInspection.findMany({
              where: { commitment: { processId: id } },
              include: { commitment: true },
            })
          : [],
      };
    if (name === 'suppliers')
      related = {
        proposals: await this.db.proposal.findMany({
          where: { supplierId: id },
          include: { process: true },
        }),
        commitments: await this.db.commitment.findMany({
          where: { supplierId: id },
          include: { process: true },
        }),
      };
    return { ...item, documents, ...related };
  }
  async save(name: string, id: string | undefined, input: unknown, user: SessionUser, ip?: string) {
    const config = this.config(name, user, true);
    if (id && config.immutable)
      throw new BadRequestException('Use as ações de avaliação deste registro.');
    const data = validate(resourceSchema(config, !!id), input) as Record<string, unknown>;
    return this.db.$transaction(
      async (tx) => {
        const model = delegate(tx, config.model);
        const before = id ? await model.findUnique({ where: { id } }) : null;
        if (id && !before) throw new NotFoundException('Registro não encontrado.');
        const nested = await this.hooks.prepare(tx, name, id, data, user);
        const item = id
          ? await model.update({ where: { id }, data: nested })
          : await model.create({ data: nested });
        await this.hooks.afterSave(tx, name, item, before, data, user);
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: id ? 'UPDATE' : 'CREATE',
            entityType: name,
            entityId: item.id,
            before: before ? json(before) : Prisma.JsonNull,
            after: json(item),
            sessionIp: ip,
          },
        });
        return item;
      },
      { timeout: 15000 },
    );
  }
  async lookup(name: string, user: SessionUser) {
    if (!user.permissions.includes('acquisition.read')) throw new ForbiddenException();
    if (name === 'specification-versions')
      return (
        await this.db.specificationVersion.findMany({
          include: { specification: true },
          take: 100,
          orderBy: { createdAt: 'desc' },
        })
      ).map((r) => ({
        id: r.id,
        label: `${r.specification.code} · ${r.specification.name} · v${r.version}`,
      }));
    if (name === 'request-items')
      return (
        await this.db.purchaseRequestItem.findMany({ include: { request: true }, take: 100 })
      ).map((r) => ({
        id: r.id,
        label: `REQ ${r.request.number}/${r.request.year} · ${r.description}`,
      }));
    if (name === 'proposal-items')
      return (
        await this.db.proposalItem.findMany({
          include: { proposal: { include: { supplier: true, process: true } } },
          take: 100,
        })
      ).map((r) => ({
        id: r.id,
        label: `${r.proposal.process.number} · ${r.proposal.supplier.tradeName} · ${r.brand} ${r.model}`,
      }));
    throw new NotFoundException();
  }
}
