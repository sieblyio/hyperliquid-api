import { Wallet } from 'ethers';

import {
  actionHash,
  signL1Action,
  signUserSignedAction,
  USER_SIGNED_ACTIONS,
} from '../../src/index.js';

const PRIVATE_KEY =
  '0x0123456789012345678901234567890123456789012345678901234567890123';
const DESTINATION = '0x5e9ee1089755c3435139848e47e6635505d5a13a';

function unpadded(value: string): string {
  return `0x${BigInt(value).toString(16)}`;
}

describe('Hyperliquid signing', () => {
  const wallet = new Wallet(PRIVATE_KEY);

  test.each([
    [
      true,
      '0x53749d5b30552aeb2fca34b530185976545bb22d0b3ce6f62e31be961a59298',
      '0x755c40ba9bf05223521753995abb2f73ab3229be8ec921f350cb447e384d8ed8',
      27,
    ],
    [
      false,
      '0x542af61ef1f429707e3c76c5293c80d01f74ef853e34b76efffcb57e574f9510',
      '0x17b8b32f086e8cdede991f1e2c529f5dd5297cbe8128500e00cbaf766204a613',
      28,
    ],
  ])(
    'matches the official dummy L1 vector for mainnet=%s',
    async (isMainnet, expectedR, expectedS, expectedV) => {
      const signature = await signL1Action(
        wallet,
        { type: 'dummy', num: 100_000_000_000 },
        undefined,
        0,
        undefined,
        isMainnet,
      );

      expect(unpadded(signature.r)).toBe(expectedR);
      expect(unpadded(signature.s)).toBe(expectedS);
      expect(signature.v).toBe(expectedV);
    },
  );

  test('matches the official L1 order hash and signature vectors', async () => {
    const action = {
      type: 'order',
      orders: [
        {
          a: 1,
          b: true,
          p: '100',
          s: '100',
          r: false,
          t: { limit: { tif: 'Gtc' } },
        },
      ],
      grouping: 'na',
    };

    expect(
      actionHash(
        {
          type: 'order',
          orders: [
            {
              a: 4,
              b: true,
              p: '1670.1',
              s: '0.0147',
              r: false,
              t: { limit: { tif: 'Ioc' } },
            },
          ],
          grouping: 'na',
        },
        undefined,
        1_677_777_606_040,
      ),
    ).toBe(
      '0x0fcbeda5ae3c4950a548021552a4fea2226858c4453571bf3f24ba017eac2908',
    );

    const signature = await signL1Action(
      wallet,
      action,
      undefined,
      0,
      undefined,
      true,
    );
    expect(signature).toEqual({
      r: '0xd65369825a9df5d80099e513cce430311d7d26ddf477f5b3a33d2806b100d78e',
      s: '0x2b54116ff64054968aa237c20ca9ff68000f977c93289157748a3162b6ea940e',
      v: 28,
    });
  });

  test('matches official vault and expiresAfter action hashing', async () => {
    const signature = await signL1Action(
      wallet,
      { type: 'dummy', num: 100_000_000_000 },
      '0x1719884eb866cb12b2287399b15f7db5e7d775ea',
      0,
      undefined,
      true,
    );
    expect(unpadded(signature.r)).toBe(
      '0x3c548db75e479f8012acf3000ca3a6b05606bc2ec0c29c50c515066a326239',
    );

    expect(
      actionHash(
        { type: 'noop' },
        '0x1719884eb866cb12b2287399b15f7db5e7d775ea',
        123,
        456,
      ),
    ).not.toBe(
      actionHash(
        { type: 'noop' },
        '0x1719884eb866cb12b2287399b15f7db5e7d775ea',
        123,
      ),
    );
  });

  test.each([
    [
      'usdSend',
      USER_SIGNED_ACTIONS.usdSend,
      {
        type: 'usdSend',
        destination: DESTINATION,
        amount: '1',
        time: 1_687_816_341_423,
      },
      {
        r: '0x637b37dd731507cdd24f46532ca8ba6eec616952c56218baeff04144e4a77073',
        s: '0x11a6a24900e6e314136d2592e2f8d502cd89b7c15b198e1bee043c9589f9fad7',
        v: 27,
      },
    ],
    [
      'withdraw',
      USER_SIGNED_ACTIONS.withdraw,
      {
        type: 'withdraw3',
        destination: DESTINATION,
        amount: '1',
        time: 1_687_816_341_423,
      },
      {
        r: '0x8363524c799e90ce9bc41022f7c39b4e9bdba786e5f9c72b20e43e1462c37cf9',
        s: '0x58b1411a775938b83e29182e8ef74975f9054c8e97ebf5ec2dc8d51bfc893881',
        v: 28,
      },
    ],
  ])(
    'matches the official %s user-signed vector',
    async (_name, definition, action, expected) => {
      const prepared = await signUserSignedAction(
        wallet,
        action,
        definition.payloadTypes,
        definition.primaryType,
        false,
      );
      expect(prepared.action).toMatchObject({
        hyperliquidChain: 'Testnet',
        signatureChainId: '0x66eee',
      });
      expect(prepared.signature).toEqual(expected);
    },
  );

  test('uses the EIP-712 definition as wire order and fixes chain headers', async () => {
    const prepared = await signUserSignedAction(
      wallet,
      {
        time: 1_687_816_341_423,
        amount: '1',
        destination: DESTINATION.toUpperCase(),
        hyperliquidChain: 'Wrong',
        signatureChainId: '0x1',
        type: 'usdSend',
      },
      USER_SIGNED_ACTIONS.usdSend.payloadTypes,
      USER_SIGNED_ACTIONS.usdSend.primaryType,
      false,
    );

    expect(Object.keys(prepared.action)).toEqual([
      'type',
      'signatureChainId',
      'hyperliquidChain',
      'destination',
      'amount',
      'time',
    ]);
    expect(prepared.action).toMatchObject({
      destination: DESTINATION,
      hyperliquidChain: 'Testnet',
      signatureChainId: '0x66eee',
    });
  });

  test('rejects user-signed fields that are not covered by EIP-712', async () => {
    await expect(
      signUserSignedAction(
        wallet,
        {
          amount: '1',
          destination: DESTINATION,
          time: 1,
          type: 'usdSend',
          unsignedField: 'unsafe',
        },
        USER_SIGNED_ACTIONS.usdSend.payloadTypes,
        USER_SIGNED_ACTIONS.usdSend.primaryType,
        false,
      ),
    ).rejects.toThrow('not included in its EIP-712 definition');
  });

  test('supports portable external signers and consistent domains', async () => {
    const signTypedData = jest.fn(wallet.signTypedData.bind(wallet));
    const externalSigner = {
      address: wallet.address.toUpperCase(),
      signTypedData,
    };

    await signL1Action(
      externalSigner,
      { type: 'noop' },
      undefined,
      1,
      undefined,
      true,
    );

    expect(signTypedData).toHaveBeenCalledWith(
      {
        chainId: 1337,
        name: 'Exchange',
        verifyingContract: '0x0000000000000000000000000000000000000000',
        version: '1',
      },
      {
        Agent: [
          { name: 'source', type: 'string' },
          { name: 'connectionId', type: 'bytes32' },
        ],
      },
      expect.objectContaining({ source: 'a' }),
    );
  });
});
