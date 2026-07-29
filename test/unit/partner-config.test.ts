import { builderFeeToApprovalPercentage } from '../../src/lib/partner-config.js';

describe('builder fee approval percentage', () => {
  test.each([
    [0, '0%'],
    [1, '0.001%'],
    [10, '0.01%'],
    [100, '0.1%'],
    [1_000, '1%'],
    [1_234, '1.234%'],
  ])('converts f=%s to %s', (builderFee, expected) => {
    expect(builderFeeToApprovalPercentage(builderFee)).toBe(expected);
  });
});
