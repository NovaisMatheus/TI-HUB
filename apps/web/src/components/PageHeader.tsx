import type { ReactNode } from 'react';
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function State({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'status'} className={error ? 'state error' : 'state'}>
      {message}
    </div>
  );
}
