import { useForm, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog } from '@hub/ui';
import type { Page } from '@hub/types';
import { api, send, ApiError } from '../services/api';
import { display, entities, object, type Entity, type Field, type Resource } from '../types';
import { useState } from 'react';
function RelationField({
  field,
  control,
}: {
  field: Field;
  control: Control<Record<string, unknown>>;
}) {
  const special = ['specification-versions', 'request-items', 'proposal-items'].includes(
    field.ref ?? '',
  );
  const query = useQuery<Page<Entity> | { id: string; label: string }[]>({
    queryKey: ['options', field.ref],
    queryFn: async () =>
      special
        ? await api<{ id: string; label: string }[]>(`lookups/${field.ref}`)
        : await api<Page<Entity>>(`records/${field.ref}?pageSize=100`),
  });
  const options = special
    ? ((query.data as { id: string; label: string }[] | undefined) ?? [])
    : ((query.data as Page<Entity> | undefined)?.items ?? []).map((row) => ({
        id: row.id,
        label: display(
          row.hostname ??
            row.tradeName ??
            row.title ??
            row.object ??
            row.number ??
            row.problem ??
            row.name,
        ),
      }));
  return (
    <>
      <Controller
        name={field.name}
        control={control}
        render={({ field: input }) => (
          <select
            id={field.name}
            name={input.name}
            ref={input.ref}
            value={String(input.value ?? '')}
            onChange={input.onChange}
            onBlur={input.onBlur}
            disabled={query.isLoading}
          >
            <option value="">{query.isLoading ? 'Carregando…' : 'Selecione…'}</option>
            {options.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        )}
      />
      {query.isError && <small className="error">Não foi possível carregar opções.</small>}
    </>
  );
}
export function EntityForm({
  resource,
  config,
  item,
  defaults,
  open,
  onClose,
  onSaved,
}: {
  resource: string;
  config: Resource;
  item?: Entity;
  defaults?: Record<string, unknown>;
  open: boolean;
  onClose: () => void;
  onSaved?: (row: Entity) => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const nestedItem = entities(
    item?.purchaseRequestItem_request ??
      item?.proposalItem_proposal ??
      item?.commitmentItem_commitment,
  )[0];
  const initial: Record<string, unknown> = {
    ...item,
    ...nestedItem,
    ...object(item?.equipmentNetwork_equipment),
    ...object(item?.equipmentHardware_equipment),
    ...defaults,
  };
  const versions = entities(
    item?.knowledgeArticleVersion_article ?? item?.specificationVersion_specification,
  );
  const latest = versions[0];
  if (latest) {
    initial.content = latest.content;
    initial.requirements = entities(latest.specificationRequirement_version)
      .map((r) => [r.group, r.field, r.operator, r.value, r.unit, r.valueType].join(' | '))
      .join('\n');
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of config.fields) {
    if (field.type === 'number')
      shape[field.name] = z.coerce.number().positive('Informe um número positivo.');
    else {
      let schema = z.string().min(field.optional ? 0 : 1, 'Campo obrigatório.');
      if (field.type === 'email') schema = z.string().email('Email inválido.');
      shape[field.name] = schema;
    }
    if (initial[field.name] === undefined)
      initial[field.name] =
        field.type === 'number'
          ? field.name === 'year'
            ? new Date().getFullYear()
            : 1
          : (field.options?.[0] ?? '');
    if (field.type === 'tags' && Array.isArray(initial[field.name]))
      initial[field.name] = (initial[field.name] as string[]).join(', ');
  }
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: fieldError,
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(z.object(shape)),
    defaultValues: initial,
  });
  async function submit(values: Record<string, unknown>) {
    setError('');
    const data = { ...values };
    for (const field of config.fields) {
      if (field.type === 'tags')
        data[field.name] = String(values[field.name] ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      if (
        field.optional &&
        data[field.name] === '' &&
        (!item || field.ref || field.type === 'email')
      )
        delete data[field.name];
    }
    try {
      const row = await send<Entity>(
        `records/${resource}${item ? '/' + item.id : ''}`,
        data,
        item ? 'PATCH' : 'POST',
      );
      await client.invalidateQueries();
      onSaved?.(row);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
      if (e instanceof ApiError && e.fields)
        for (const [field, messages] of Object.entries(e.fields))
          fieldError(field, { message: messages.join(' ') });
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`${item ? (resource === 'knowledge' || resource === 'specifications' ? 'Nova versão de' : 'Editar') : 'Cadastrar'} ${config.singular.toLowerCase()}`}
      wide
    >
      <form onSubmit={handleSubmit(submit)}>
        <div className="form-scroll">
          <p className="form-intro">
            {resource === 'knowledge' || resource === 'specifications'
              ? 'O conteúdo será salvo em uma nova versão. Versões anteriores permanecem preservadas.'
              : 'Informações registradas pela equipe, com rastreabilidade de alterações.'}
          </p>
          <div className="form-grid">
            {config.fields.map((field) => (
              <div
                key={field.name}
                className={`field ${field.type === 'textarea' ? 'field-wide' : ''}`}
              >
                <label htmlFor={field.name}>
                  {field.label}
                  {!field.optional && <span aria-hidden="true"> *</span>}
                </label>
                {field.ref ? (
                  <RelationField field={field} control={control} />
                ) : field.options ? (
                  <select id={field.name} {...register(field.name)}>
                    {field.options.map((v) => (
                      <option key={v} value={v}>
                        {v.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    rows={field.name === 'content' ? 8 : 3}
                    {...register(field.name)}
                  />
                ) : (
                  <input
                    id={field.name}
                    type={
                      field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'
                    }
                    step="any"
                    {...register(field.name)}
                  />
                )}
                <small className="error">{String(errors[field.name]?.message ?? '')}</small>
              </div>
            ))}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <footer className="form-footer">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar registro'}</Button>
        </footer>
      </form>
    </Dialog>
  );
}
