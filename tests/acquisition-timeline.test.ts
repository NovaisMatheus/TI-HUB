import { describe, it, expect } from 'vitest';
import {
  acquisitionTimeline,
  publicationDate,
  briefDescription,
} from '../apps/api/src/acquisitions/timeline';
describe('Timeline de publicação dos despachos', () => {
  it('preserva hora, segundos e fuso de São Paulo, incluindo horário de verão histórico', () => {
    expect(publicationDate('Em 07/10/2026 11:15:50')).toEqual({
      occurredAt: '2026-10-07T14:15:50.000Z',
      dateOnly: false,
    });
    expect(publicationDate('Em 15/12/2017 11:15')).toEqual({
      occurredAt: '2017-12-15T13:15:00.000Z',
      dateOnly: false,
    });
    expect(publicationDate('07/10/2026')).toEqual({
      occurredAt: '2026-10-07T03:00:00.000Z',
      dateOnly: true,
    });
  });
  it('não inventa data para informação incompleta ou inválida', () => {
    expect(publicationDate('ontem às 12:30')).toBeNull();
    expect(publicationDate('Em 31/02/2026 11:00')).toBeNull();
    expect(publicationDate('Em 07/10/2026 25:30')).toBeNull();
    expect(publicationDate('')).toBeNull();
  });
  it('ordena pela publicação, conserva despachos sem data e não duplica coletas', () => {
    const dispatches = [
      {
        id: 'later',
        sourceId: 'two',
        sequence: 2,
        title: 'Despacho 2',
        author: 'Pessoa B',
        dateLabel: 'Em 07/10/2026 12:00',
        content: 'Não aprovar sem conferir o orçamento. Solicita revisão.',
        metadata: {},
      },
      {
        id: 'earlier',
        sourceId: 'one',
        sequence: 1,
        title: 'Despacho 1',
        author: 'Pessoa A',
        dateLabel: 'Em 07/10/2026 11:00',
        content: 'Segue o orçamento.',
        metadata: {},
      },
      {
        id: 'unknown',
        sourceId: 'three',
        sequence: 3,
        title: 'Despacho 3',
        author: '',
        dateLabel: '',
        content: '',
        metadata: {},
      },
    ];
    const events = [
      { id: 'import', occurredAt: new Date('2026-10-08T12:00:00Z'), title: 'Importado' },
    ];
    const timeline = acquisitionTimeline(events, dispatches);
    expect(timeline.map((event) => event.id)).toEqual([
      '1doc-dispatch-earlier',
      '1doc-dispatch-later',
      'import',
      '1doc-dispatch-unknown',
    ]);
    expect(timeline).toEqual(acquisitionTimeline(events, dispatches));
    expect(timeline[1]).toMatchObject({
      description: 'Não aprovar sem conferir o orçamento. Solicita revisão.',
      dispatch: dispatches[0],
      summaryMode: 'LOCAL_EXTRACTIVE',
    });
    expect(timeline[3].occurredAt).toBeNull();
  });
  it('gera descrição curta a partir do texto sem presumir conteúdo de anexos', () => {
    expect(briefDescription('Segue anexo.\nConfira o descritivo.\nDetalhes adicionais.')).toBe(
      'Segue anexo. Confira o descritivo.',
    );
    expect(briefDescription('')).toBe('Despacho sem conteúdo textual carregado.');
    expect(briefDescription('texto '.repeat(200)).length).toBeLessThanOrEqual(420);
  });
});
