import type { BuilderCode } from '../../src/index.js';
import { ActionFactory } from '../../src/lib/action-factory.js';
import type { AssetResolver } from '../../src/lib/asset-resolver.js';

const BUILDER: BuilderCode = {
  b: '0x1111111111111111111111111111111111111111',
  f: 10,
};

function factory(builder: BuilderCode | null = BUILDER): ActionFactory {
  const ids = new Map<string | number, number>([
    ['BTC', 0],
    ['@107', 10_107],
    ['xyz:COIN', 110_000],
    ['#10', 100_000_010],
  ]);
  const resolver = {
    resolve: jest.fn(async (asset: string | number) => ({
      assetId: ids.get(asset) ?? Number(asset),
      canonicalName: String(asset),
      kind: 'perp' as const,
    })),
  } as unknown as AssetResolver;
  return new ActionFactory(resolver, () => builder ?? undefined);
}

describe('ActionFactory', () => {
  test('builds canonical orders with exact strings and the hardcoded builder', async () => {
    const action = await factory().order(
      [
        {
          a: 'BTC',
          b: true,
          c: '0x00000000000000000000000000000001',
          p: '10.000',
          r: false,
          s: '1.2300',
          t: {
            trigger: {
              isMarket: true,
              tpsl: 'tp',
              triggerPx: '12.3400',
            },
          },
        },
      ],
      { p: 7 },
    );

    expect(action).toEqual({
      type: 'order',
      orders: [
        {
          a: 0,
          b: true,
          p: '10',
          s: '1.23',
          r: false,
          t: {
            trigger: {
              isMarket: true,
              triggerPx: '12.34',
              tpsl: 'tp',
            },
          },
          c: '0x00000000000000000000000000000001',
        },
      ],
      grouping: { p: 7 },
      builder: BUILDER,
    });
  });

  test('rejects numbers and exponent notation in decimal fields', async () => {
    await expect(
      factory().canonicalizeRaw({
        type: 'order',
        orders: [
          {
            a: 'BTC',
            b: true,
            p: 10,
            s: '1',
            r: false,
            t: { limit: { tif: 'Gtc' } },
          },
        ],
      }),
    ).rejects.toThrow('decimal strings');
    await expect(
      factory().order([
        {
          a: 'BTC',
          b: true,
          p: '1e5',
          r: false,
          s: '1',
          t: { limit: { tif: 'Gtc' } },
        },
      ]),
    ).rejects.toThrow('plain decimal notation');
  });

  test('rejects a missing or empty raw order array clearly', async () => {
    await expect(factory().order(undefined as unknown as [])).rejects.toThrow(
      'submitOrder requires a non-empty orders array',
    );
    await expect(factory().order([])).rejects.toThrow(
      'submitOrder requires a non-empty orders array',
    );
  });

  test('overwrites builder tags on raw orders and keeps stable field ordering', async () => {
    const action = await factory().canonicalizeRaw({
      orders: [
        {
          t: { limit: { tif: 'Gtc' } },
          s: '1.000',
          r: false,
          p: '10.00',
          b: false,
          a: '@107',
        },
      ],
      builder: {
        b: '0x2222222222222222222222222222222222222222',
        f: 0,
      },
      type: 'order',
    });

    expect(Object.keys(action)).toEqual([
      'type',
      'orders',
      'grouping',
      'builder',
    ]);
    expect(action.builder).toEqual(BUILDER);
    expect(action.orders).toEqual([
      {
        a: 10_107,
        b: false,
        p: '10',
        s: '1',
        r: false,
        t: { limit: { tif: 'Gtc' } },
      },
    ]);
  });

  test('removes caller-provided builders while approval is unavailable', async () => {
    const action = await factory(null).canonicalizeRaw({
      type: 'order',
      orders: [
        {
          a: 'BTC',
          b: true,
          p: '10',
          r: false,
          s: '1',
          t: { limit: { tif: 'Gtc' } },
        },
      ],
      builder: BUILDER,
    });

    expect(action).not.toHaveProperty('builder');
  });

  test('builds modifications and cancellations for every asset family', async () => {
    const actions = factory();
    const order = {
      a: 'xyz:COIN',
      b: true,
      p: '2',
      r: false,
      s: '3',
      t: { limit: { tif: 'Ioc' as const } },
    };

    await expect(
      actions.modify({ oid: 4, order }, true),
    ).resolves.toMatchObject({
      type: 'modify',
      oid: 4,
      order: { a: 110_000 },
      a: true,
    });
    await expect(
      actions.batchModify([{ oid: '0x01', order }], true),
    ).resolves.toMatchObject({
      type: 'batchModify',
      modifies: [{ oid: '0x01', order: { a: 110_000 } }],
      a: true,
    });
    await expect(actions.cancel([{ a: '#10', o: 5 }], true)).resolves.toEqual({
      type: 'cancel',
      cancels: [{ a: 100_000_010, o: 5 }],
      f: true,
    });
    await expect(
      actions.cancelByCloid(
        [{ asset: '@107', cloid: '0x00000000000000000000000000000001' }],
        true,
      ),
    ).resolves.toEqual({
      type: 'cancelByCloid',
      cancels: [
        {
          asset: 10_107,
          cloid: '0x00000000000000000000000000000001',
        },
      ],
      f: true,
    });
  });

  test('canonicalizes TWAP, deployer, validator, and outcome nested fields', async () => {
    const actions = factory();

    await expect(
      actions.canonicalizeRaw({
        type: 'twapOrder',
        twap: {
          t: true,
          s: '2.500',
          r: false,
          m: 10,
          b: true,
          a: 'BTC',
        },
      }),
    ).resolves.toEqual({
      type: 'twapOrder',
      twap: { a: 0, b: true, s: '2.5', r: false, m: 10, t: true },
    });

    const deploy = await actions.canonicalizeRaw({
      type: 'perpDeploy',
      registerAsset2: {
        schema: {
          oracleUpdater: null,
          collateralToken: 0,
          fullName: 'Coin',
        },
        dex: 'xyz',
        assetRequest: {
          marginMode: 'isolatedOnly',
          marginTableId: 3,
          oraclePx: '1',
          szDecimals: 2,
          coin: 'COIN',
        },
        maxGas: 1,
      },
    });
    expect(Object.keys(deploy.registerAsset2 as object)).toEqual([
      'maxGas',
      'assetRequest',
      'dex',
      'schema',
    ]);

    const outcome = await actions.canonicalizeRaw({
      type: 'userOutcome',
      splitOutcome: { amount: '1.200', outcome: 10 },
    });
    expect(outcome).toEqual({
      type: 'userOutcome',
      splitOutcome: { outcome: 10, amount: '1.2' },
    });
  });
});
