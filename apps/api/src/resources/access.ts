import type { SessionUser } from '@hub/types';
import { catalog } from './catalog';
const dependencies: Record<string, string[]> = {
  maintenance: ['equipment.read'],
  analyses: ['acquisition.read'],
  inspections: ['acquisition.read'],
};
export function canAccess(name: string, user: SessionUser, write = false) {
  const config = catalog[name];
  if (!config) return false;
  const keys = [
    config.permission + '.read',
    ...(dependencies[name] ?? []),
    ...(write ? [config.permission + '.write'] : []),
  ];
  return keys.every((key) => user.permissions.includes(key));
}
