import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { RecordHooks } from '../apps/api/src/resources/record-hooks';
const user = {
  id: 'actor',
  name: 'Pessoa QA',
  email: 'qa@example.invalid',
  permissions: ['equipment.read', 'acquisition.read'],
};
const hooks = new RecordHooks();
describe('Edições parciais preservam vínculos e versões', () => {
  it('permite alterar título de documento preservando vínculo e autor original', async () => {
    const tx = {
      documentReference: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ entityType: 'equipment', entityId: 'pc', createdById: 'original' }),
      },
      equipment: { findUnique: vi.fn().mockResolvedValue({ id: 'pc' }) },
    };
    const result = await hooks.prepare(
      tx as unknown as Prisma.TransactionClient,
      'documents',
      'doc',
      { title: 'Título revisado' },
      user,
    );
    expect(result).toEqual({ title: 'Título revisado' });
    expect(tx.equipment.findUnique).toHaveBeenCalledWith({ where: { id: 'pc' } });
  });
  it('copia os requisitos da última versão quando apenas o conteúdo é atualizado', async () => {
    const requirement = {
      id: 'req',
      versionId: 'old',
      group: 'Garantia',
      field: 'Prazo',
      operator: '>=',
      value: '36',
      unit: 'meses',
      valueType: 'numero',
    };
    const tx = {
      specificationVersion: { findFirst: vi.fn().mockResolvedValue({ id: 'old', version: 2 }) },
      specificationRequirement: { findMany: vi.fn().mockResolvedValue([requirement]) },
    };
    const result = await hooks.prepare(
      tx as unknown as Prisma.TransactionClient,
      'specifications',
      'spec',
      { content: 'Conteúdo revisado' },
      user,
    );
    expect(result.specificationVersion_specification).toEqual({
      create: {
        version: 3,
        content: 'Conteúdo revisado',
        specificationRequirement_version: {
          create: [
            {
              group: 'Garantia',
              field: 'Prazo',
              operator: '>=',
              value: '36',
              unit: 'meses',
              valueType: 'numero',
            },
          ],
        },
      },
    });
  });
  it('recusa requisitos isolados em vez de descartá-los silenciosamente', async () => {
    await expect(
      hooks.prepare(
        {} as Prisma.TransactionClient,
        'specifications',
        'spec',
        { requirements: 'Memória | RAM | >= | 16' },
        user,
      ),
    ).rejects.toThrow('informe também o conteúdo');
  });
  it('valida o item existente ao editar somente o preço de uma proposta', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      technicalAnalysis: { count: vi.fn().mockResolvedValue(0) },
      proposal: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ processId: 'process', supplierId: 'supplier' }),
      },
      proposalItem: {
        findFirst: vi.fn().mockResolvedValue({ id: 'item', requestItemId: 'requested' }),
      },
      purchaseProcess: {
        findUnique: vi.fn().mockResolvedValue({ id: 'process', requestId: 'request' }),
      },
      purchaseRequestItem: { findUnique: vi.fn().mockResolvedValue({ requestId: 'request' }) },
    };
    const result = await hooks.prepare(
      tx as unknown as Prisma.TransactionClient,
      'proposals',
      'proposal',
      { price: 3500 },
      user,
    );
    expect(result.proposalItem_proposal).toEqual({
      update: { where: { id: 'item' }, data: { price: 3500 } },
    });
    expect(tx.purchaseProcess.findUnique).toHaveBeenCalledWith({ where: { id: 'process' } });
  });
  it('recusa trocar o processo de uma proposta existente', async () => {
    const tx = {
      technicalAnalysis: { count: vi.fn().mockResolvedValue(0) },
      proposal: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ processId: 'process', supplierId: 'supplier' }),
      },
    };
    await expect(
      hooks.prepare(
        tx as unknown as Prisma.TransactionClient,
        'proposals',
        'proposal',
        { processId: 'other' },
        user,
      ),
    ).rejects.toThrow('registre uma nova proposta');
  });
  it('valida vínculos existentes ao editar somente o valor de um empenho', async () => {
    const tx = {
      technicalInspection: { count: vi.fn().mockResolvedValue(0) },
      commitment: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          processId: 'process',
          requestId: 'request',
          supplierId: 'supplier',
        }),
      },
      commitmentItem: {
        findFirst: vi.fn().mockResolvedValue({ id: 'item', proposalItemId: 'proposed' }),
      },
      proposalItem: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ proposal: { processId: 'process', supplierId: 'supplier' } }),
      },
      purchaseProcess: { findUnique: vi.fn().mockResolvedValue({ requestId: 'request' }) },
    };
    const result = await hooks.prepare(
      tx as unknown as Prisma.TransactionClient,
      'commitments',
      'commitment',
      { value: 4000 },
      user,
    );
    expect(result.commitmentItem_commitment).toEqual({
      update: { where: { id: 'item' }, data: { value: 4000 } },
    });
  });
});
