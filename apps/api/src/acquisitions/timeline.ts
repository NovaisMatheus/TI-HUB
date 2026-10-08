type Dispatch = {
  id: string;
  sourceId: string;
  sequence: number;
  title: string;
  author: string;
  dateLabel: string;
  content: string;
  metadata: unknown;
};
type Event = { id: string; occurredAt: Date; [key: string]: unknown };
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
export function publicationDate(label: string): { occurredAt: string; dateOnly: boolean } | null {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(label)) {
    const date = new Date(label);
    return Number.isNaN(date.getTime())
      ? null
      : { occurredAt: date.toISOString(), dateOnly: false };
  }
  const match = label.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[^\d]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return null;
  const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
  const nominal = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const parts = new Date(nominal);
  if (
    parts.getUTCFullYear() !== +year ||
    parts.getUTCMonth() !== +month - 1 ||
    parts.getUTCDate() !== +day ||
    parts.getUTCHours() !== +hour ||
    parts.getUTCMinutes() !== +minute ||
    parts.getUTCSeconds() !== +second
  )
    return null;
  let instant = nominal;
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = Object.fromEntries(
      formatter.formatToParts(instant).map((p) => [p.type, p.value]),
    );
    const shown = Date.UTC(
      +local.year,
      +local.month - 1,
      +local.day,
      +local.hour,
      +local.minute,
      +local.second,
    );
    if (shown === nominal)
      return { occurredAt: new Date(instant).toISOString(), dateOnly: !match[4] };
    instant += nominal - shown;
  }
  return null;
}
export function briefDescription(content: string) {
  const sentences = content
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const text = sentences.slice(0, 2).join(' ');
  return text.length > 420
    ? text.slice(0, 417).replace(/\s+\S*$/, '') + '…'
    : text || 'Despacho sem conteúdo textual carregado.';
}
export function acquisitionTimeline(events: Event[], dispatches: Dispatch[]) {
  const source = dispatches.map((dispatch) => {
    const date = publicationDate(dispatch.dateLabel);
    return {
      id: `1doc-dispatch-${dispatch.id}`,
      eventType: 'DISPATCH_PUBLISHED',
      title: dispatch.title,
      description: briefDescription(dispatch.content),
      occurredAt: date?.occurredAt ?? null,
      dateOnly: date?.dateOnly ?? false,
      dateLabel: dispatch.dateLabel,
      source: '1doc',
      sequence: dispatch.sequence,
      author: dispatch.author,
      summaryMode: 'LOCAL_EXTRACTIVE',
      dispatch,
    };
  });
  return [
    ...events.map((event) => ({
      ...event,
      source: 'hub',
      occurredAt: event.occurredAt.toISOString(),
    })),
    ...source,
  ].sort((a, b) => {
    const aTime = a.occurredAt ? Date.parse(a.occurredAt) : Infinity;
    const bTime = b.occurredAt ? Date.parse(b.occurredAt) : Infinity;
    return (
      aTime - bTime ||
      Number('sequence' in a ? a.sequence : 0) - Number('sequence' in b ? b.sequence : 0) ||
      a.id.localeCompare(b.id)
    );
  });
}
