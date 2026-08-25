import type { UserRequest } from '../types/request/info.types.js';
import type { BuilderCode, JsonObject } from '../types/shared.types.js';
import type { ResolvedAsset } from './asset-resolver.js';
import { decimalToWire } from './decimal.js';
import { normalizeAddresses } from './normalize-addresses.js';
import { sanitizeObjectForWire } from './wire.js';

export function normalizeUserRequest<T extends UserRequest>(params: T): T {
  return normalizeAddresses(params);
}

export function buildUserSignedAction(
  type: string,
  params: object,
): JsonObject {
  const fields = normalizeAddresses(sanitizeObjectForWire({ ...params }));
  delete fields.type;

  return {
    type,
    ...fields,
    ...('nonce' in fields || 'time' in fields ? {} : { nonce: 0 }),
  };
}

export function decimalOrSubaccountAmount(value: string): string {
  const match = /^(.+?)\s+subaccount:(0x[0-9a-fA-F]{40})$/.exec(value);
  if (!match) {
    return decimalToWire(value);
  }

  return `${decimalToWire(match[1])} subaccount:${normalizeAddresses(match[2])}`;
}

export function positiveDecimal(value: string, field: string): string {
  const normalized = decimalToWire(value);
  if (normalized === '0' || normalized.startsWith('-')) {
    throw new RangeError(`${field} must be greater than zero.`);
  }
  return normalized;
}

export function floorDecimalPlaces(
  value: string,
  decimalPlaces: number,
  field: string,
): string {
  const normalized = positiveDecimal(value, field);
  const [integer, fraction = ''] = normalized.split('.');
  const truncatedFraction = fraction.slice(0, decimalPlaces);
  const truncated = decimalToWire(
    truncatedFraction ? `${integer}.${truncatedFraction}` : integer,
  );
  if (truncated === '0') {
    throw new RangeError(
      `${field} rounds to zero at ${decimalPlaces} decimal places.`,
    );
  }
  return truncated;
}

export function marketLimitPrice(
  mid: string,
  isBuy: boolean,
  maxSlippage: number,
  asset: ResolvedAsset,
): string {
  if (asset.szDecimals === undefined) {
    throw new TypeError(
      `Market order metadata is unavailable for "${asset.canonicalName}". Use a metadata-derived symbol instead of a numeric asset ID.`,
    );
  }

  const midNumber = Number(mid);
  if (!Number.isFinite(midNumber) || midNumber <= 0) {
    throw new TypeError(
      `Hyperliquid returned an invalid midpoint for "${asset.canonicalName}".`,
    );
  }

  const maxPriceDecimals =
    (asset.kind === 'spot' || asset.kind === 'outcome' ? 8 : 6) -
    asset.szDecimals;
  if (maxPriceDecimals < 0) {
    throw new TypeError(
      `Hyperliquid returned invalid size decimals for "${asset.canonicalName}".`,
    );
  }

  const adjusted = midNumber * (isBuy ? 1 + maxSlippage : 1 - maxSlippage);
  const fiveSignificantFigures = Number(adjusted.toPrecision(5));
  return positiveDecimal(
    fiveSignificantFigures.toFixed(maxPriceDecimals),
    'Market order limit price',
  );
}

export const SIEBLY_REFERRAL_CODE: string = 'SIEBLY';
export const SIEBLY_BUILDER_ADDRESS: string =
  '0x72f1ad41b790228c4bc4c08eb1e007bf6e4448c2';
export const SIEBLY_BUILDER_FEE: number = 10;

export interface PartnerConfiguration {
  approvalPercentage: string;
  builder: BuilderCode;
  referralCode: string;
}

export function builderFeeToApprovalPercentage(builderFee: number): string {
  const whole = Math.floor(builderFee / 1000);
  const fraction = String(builderFee % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');

  return `${whole}${fraction ? `.${fraction}` : ''}%`;
}

export function getPartnerConfiguration(): PartnerConfiguration {
  const builderFee = SIEBLY_BUILDER_FEE;

  if (!/^0x[0-9a-fA-F]{40}$/.test(SIEBLY_BUILDER_ADDRESS)) {
    throw new Error(
      'The configured Siebly builder address is not a valid EVM address.',
    );
  }

  if (
    typeof builderFee !== 'number' ||
    !Number.isInteger(builderFee) ||
    builderFee < 0 ||
    builderFee > 100
  ) {
    throw new Error(
      'The configured Siebly builder fee must be an integer from 0 through 100.',
    );
  }

  return {
    approvalPercentage: builderFeeToApprovalPercentage(builderFee),
    builder: {
      b: SIEBLY_BUILDER_ADDRESS.toLowerCase(),
      f: builderFee,
    },
    referralCode: SIEBLY_REFERRAL_CODE,
  };
}
