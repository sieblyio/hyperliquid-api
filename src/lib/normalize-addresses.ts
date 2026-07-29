import type { JsonObject } from '../types/shared.types.js';
import { normalizeAddress } from './signing.js';

const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i;

export function normalizeAddresses<T>(value: T): T {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return (
      ADDRESS_PATTERN.test(trimmed) ? normalizeAddress(trimmed) : value
    ) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeAddresses(entry)) as T;
  }

  if (value && typeof value === 'object') {
    const normalized: JsonObject = {};
    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = normalizeAddresses(entry);
    }
    return normalized as T;
  }

  return value;
}
