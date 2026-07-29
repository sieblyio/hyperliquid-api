const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

/**
 * Canonicalize a decimal string without converting it through JavaScript's
 * floating-point number type.
 */
export function decimalToWire(value: string): string {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) {
    throw new TypeError(
      `Invalid decimal string "${value}". Use plain decimal notation without exponents or leading zeroes.`,
    );
  }

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integer, rawFraction] = unsigned.split('.');
  const fraction = rawFraction?.replace(/0+$/, '');
  const normalized = fraction ? `${integer}.${fraction}` : integer;

  return negative && normalized !== '0' ? `-${normalized}` : normalized;
}

export function decimalToScaledInteger(
  value: string,
  decimalPlaces: number,
): number {
  const normalized = decimalToWire(value);
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integer, fraction = ''] = unsigned.split('.');

  if (fraction.length > decimalPlaces) {
    throw new RangeError(
      `${value} has more than ${decimalPlaces} decimal places.`,
    );
  }

  const scaled =
    BigInt(integer) * 10n ** BigInt(decimalPlaces) +
    BigInt(fraction.padEnd(decimalPlaces, '0') || '0');
  const signed = negative ? -scaled : scaled;

  if (
    signed > BigInt(Number.MAX_SAFE_INTEGER) ||
    signed < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError(
      `${value} cannot be represented safely as a scaled JavaScript integer.`,
    );
  }

  return Number(signed);
}
