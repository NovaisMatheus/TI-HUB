// An acquisition's imported source policy also protects its derived records.
export function aiPolicy(name: string): Record<string, unknown> {
  const sourcePolicy = { dataPolicy: { not: 'NO_AI' } };
  if (name === 'specifications')
    return {
      NOT: {
        specificationVersion_specification: {
          some: {
            purchaseRequestItem_specificationVersion: {
              some: {
                request: { purchaseProcess_request: { some: { dataPolicy: 'NO_AI' } } },
              },
            },
          },
        },
      },
    };
  if (name === 'requests') return { purchaseProcess_request: { none: { dataPolicy: 'NO_AI' } } };
  if (name === 'proposals' || name === 'commitments') return { process: sourcePolicy };
  if (name === 'inspections') return { commitment: { process: sourcePolicy } };
  if (name === 'analyses') return { ...sourcePolicy, process: sourcePolicy };
  return [
    'equipment',
    'maintenance',
    'knowledge',
    'recommendations',
    'solutions',
    'acquisitions',
    'documents',
    'demands',
  ].includes(name)
    ? sourcePolicy
    : {};
}
