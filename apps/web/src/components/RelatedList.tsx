import { Link } from 'react-router-dom';
import { Badge } from '@hub/ui';
import { display, type Entity } from '../types';
export function RelatedList({
  title,
  rows,
  resource,
}: {
  title: string;
  rows: Entity[];
  resource: string;
}) {
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      {rows.length ? (
        rows.map((row) => (
          <Link key={row.id} className="related-row" to={`/${resource}/${row.id}`}>
            <span>
              {display(
                row.title ??
                  row.problem ??
                  row.number ??
                  row.model ??
                  row.supplier ??
                  row.process ??
                  row.id,
              )}
            </span>
            <Badge value={String(row.status ?? row.result ?? 'REGISTRADO')} />
          </Link>
        ))
      ) : (
        <p className="muted">Nenhum registro relacionado.</p>
      )}
    </section>
  );
}
