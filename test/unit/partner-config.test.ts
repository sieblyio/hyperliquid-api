import {
  approvalPercentageToBuilderFee,
  builderFeeToApprovalPercentage,
} from '../../src/lib/request-utils.js';

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
    expect(approvalPercentageToBuilderFee(expected)).toBe(builderFee);
  });

  test('rejects percent strings that are not a builder fee', () => {
    expect(approvalPercentageToBuilderFee('0')).toBeUndefined();
    expect(approvalPercentageToBuilderFee('0.0001%')).toBeUndefined();
    expect(approvalPercentageToBuilderFee('0.1')).toBeUndefined();
  });
});
