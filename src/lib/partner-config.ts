import type { BuilderCode } from '../types/shared.types.js';

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
