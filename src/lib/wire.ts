import type { JsonObject } from '../types/shared.types.js';

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeForWire(value: unknown, inArray = false): unknown {
  if (value === undefined) {
    return inArray ? null : undefined;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Exchange actions cannot contain NaN or Infinity.');
    }
    return value;
  }

  if (typeof value === 'bigint') {
    throw new TypeError(
      'Exchange actions cannot contain bigint values because JSON cannot serialize them. Use a documented string or safe integer field.',
    );
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForWire(entry, true));
  }

  if (typeof value !== 'object' || !isPlainObject(value)) {
    throw new TypeError(
      'Exchange actions may only contain JSON-compatible plain objects.',
    );
  }

  const output: JsonObject = {};
  for (const [key, entry] of Object.entries(value)) {
    const sanitized = sanitizeForWire(entry);
    if (sanitized !== undefined) {
      output[key] = sanitized;
    }
  }

  return output;
}

export function sanitizeObjectForWire(value: JsonObject): JsonObject {
  return sanitizeForWire(value) as JsonObject;
}
