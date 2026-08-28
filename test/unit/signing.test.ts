import { Wallet } from 'ethers';

import {
  actionHash,
  signL1Action,
  signMultiSigUserSignedAction,
  signUserSignedAction,
} from '../../src/lib/signing.js';
import { USER_SIGNED_ACTIONS } from '../../src/lib/user-signed-actions.js';

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

    const testnet = await signL1Action(
      wallet,
      action,
      undefined,
      0,
      undefined,
      false,
    );
    expect(unpadded(testnet.r)).toBe(
      '0x82b2ba28e76b3d761093aaded1b1cdad4960b3af30212b343fb2e6cdfa4e3d54',
    );
    expect(unpadded(testnet.s)).toBe(
      '0x6b53878fc99d26047f4d7e8c90eb98955a109f44209163f52d8dc4278cbbd9f5',
    );
    expect(testnet.v).toBe(27);
  });

  test('matches official order signatures with a cloid', async () => {
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
          c: '0x00000000000000000000000000000001',
        },
      ],
      grouping: 'na',
    };

    const mainnet = await signL1Action(
      wallet,
      action,
      undefined,
      0,
      undefined,
      true,
    );
    expect(unpadded(mainnet.r)).toBe(
      '0x41ae18e8239a56cacbc5dad94d45d0b747e5da11ad564077fcac71277a946e3',
    );
    expect(unpadded(mainnet.s)).toBe(
      '0x3c61f667e747404fe7eea8f90ab0e76cc12ce60270438b2058324681a00116da',
    );
    expect(mainnet.v).toBe(27);

    const testnet = await signL1Action(
      wallet,
      action,
      undefined,
      0,
      undefined,
      false,
    );
    expect(unpadded(testnet.r)).toBe(
      '0xeba0664bed2676fc4e5a743bf89e5c7501aa6d870bdb9446e122c9466c5cd16d',
    );
    expect(unpadded(testnet.s)).toBe(
      '0x7f3e74825c9114bc59086f1eebea2928c190fdfbfde144827cb02b85bbe90988',
    );
    expect(testnet.v).toBe(28);
  });

  test('matches official TP/SL trigger order signatures', async () => {
    const action = {
      type: 'order',
      orders: [
        {
          a: 1,
          b: true,
          p: '100',
          s: '100',
          r: false,
          t: {
            trigger: {
              isMarket: true,
              triggerPx: '103',
              tpsl: 'sl',
            },
          },
        },
      ],
      grouping: 'na',
    };

    const mainnet = await signL1Action(
      wallet,
      action,
      undefined,
      0,
      undefined,
      true,
    );
    expect(unpadded(mainnet.r)).toBe(
      '0x98343f2b5ae8e26bb2587daad3863bc70d8792b09af1841b6fdd530a2065a3f9',
    );
    expect(unpadded(mainnet.s)).toBe(
      '0x6b5bb6bb0633b710aa22b721dd9dee6d083646a5f8e581a20b545be6c1feb405',
    );
    expect(mainnet.v).toBe(27);

    const testnet = await signL1Action(
      wallet,
      action,
      undefined,
      0,
      undefined,
      false,
    );
    expect(unpadded(testnet.r)).toBe(
      '0x971c554d917c44e0e1b6cc45d8f9404f32172a9d3b3566262347d0302896a2e4',
    );
    expect(unpadded(testnet.s)).toBe(
      '0x206257b104788f80450f8e786c329daa589aa0b32ba96948201ae556d5637eac',
    );
    expect(testnet.v).toBe(28);
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
    expect(unpadded(signature.s)).toBe(
      '0x4d402be7396ce74fbba3795769cda45aec00dc3125a984f2a9f23177b190da2c',
    );
    expect(signature.v).toBe(28);

    const testnet = await signL1Action(
      wallet,
      { type: 'dummy', num: 100_000_000_000 },
      '0x1719884eb866cb12b2287399b15f7db5e7d775ea',
      0,
      undefined,
      false,
    );
    expect(unpadded(testnet.r)).toBe(
      '0xe281d2fb5c6e25ca01601f878e4d69c965bb598b88fac58e475dd1f5e56c362b',
    );
    expect(unpadded(testnet.s)).toBe(
      '0x7ddad27e9a238d045c035bc606349d075d5c5cd00a6cd1da23ab5c39d4ef0f60',
    );
    expect(testnet.v).toBe(27);

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

  test.each([
    [
      true,
      '0x51096fe3239421d16b671e192f574ae24ae14329099b6db28e479b86cdd6caa7',
      '0xb71f7d293af92d3772572afb8b102d167a7cef7473388286bc01f52a5c5b423',
      27,
    ],
    [
      false,
      '0xa699e3ed5c2b89628c746d3298b5dc1cca604694c2c855da8bb8250ec8014a5b',
      '0x53f1b8153a301c72ecc655b1c315d64e1dcea3ee58921fd7507e35818fcc1584',
      28,
    ],
  ])(
    'matches official createSubAccount for mainnet=%s',
    async (isMainnet, expectedR, expectedS, expectedV) => {
      const signature = await signL1Action(
        wallet,
        { type: 'createSubAccount', name: 'example' },
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

  test.each([
    [
      true,
      '0x43592d7c6c7d816ece2e206f174be61249d651944932b13343f4d13f306ae602',
      '0x71a926cb5c9a7c01c3359ec4c4c34c16ff8107d610994d4de0e6430e5cc0f4c9',
      28,
    ],
    [
      false,
      '0xe26574013395ad55ee2f4e0575310f003c5bb3351b5425482e2969fa51543927',
      '0xefb08999196366871f919fd0e138b3a7f30ee33e678df7cfaf203e25f0a4278',
      28,
    ],
  ])(
    'matches official subAccountTransfer for mainnet=%s',
    async (isMainnet, expectedR, expectedS, expectedV) => {
      const signature = await signL1Action(
        wallet,
        {
          type: 'subAccountTransfer',
          subAccountUser: '0x1d9470d4b963f552e6f671a81619d395877bf409',
          isDeposit: true,
          usd: 10,
        },
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

  test.each([
    [
      {},
      true,
      '0x6cdfb286702f5917e76cd9b3b8bf678fcc49aec194c02a73e6d4f16891195df9',
      '0x6557ac307fa05d25b8d61f21fb8a938e703b3d9bf575f6717ba21ec61261b2a0',
      27,
    ],
    [
      {},
      false,
      '0xc75bb195c3f6a4e06b7d395acc20bbb224f6d23ccff7c6a26d327304e6efaeed',
      '0x342f8ede109a29f2c0723bd5efb9e9100e3bbb493f8fb5164ee3d385908233df',
      28,
    ],
    [
      { time: 123_456_789 },
      true,
      '0x609cb20c737945d070716dcc696ba030e9976fcf5edad87afa7d877493109d55',
      '0x16c685d63b5c7a04512d73f183b3d7a00da5406ff1f8aad33f8ae2163bab758b',
      28,
    ],
    [
      { time: 123_456_789 },
      false,
      '0x4e4f2dbd4107c69783e251b7e1057d9f2b9d11cee213441ccfa2be63516dc5bc',
      '0x706c656b23428c8ba356d68db207e11139ede1670481a9e01ae2dfcdb0e1a678',
      27,
    ],
  ])(
    'matches official scheduleCancel %j mainnet=%s',
    async (extra, isMainnet, expectedR, expectedS, expectedV) => {
      const signature = await signL1Action(
        wallet,
        { type: 'scheduleCancel', ...extra },
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

  test('maps userSetAbstraction disabled to i in the multi-sig payload', async () => {
    const action = {
      type: 'userSetAbstraction',
      signatureChainId: '0x66eee',
      hyperliquidChain: 'Testnet',
      user: '0x3b4d2cc2e144a0044002506c8b44508e9ace82e9',
      abstraction: 'disabled',
      nonce: 1_780_130_409_592,
    };
    const prepared = await signMultiSigUserSignedAction(
      [wallet],
      '0x3b4d2cc2e144a0044002506c8b44508e9ace82e9',
      action,
      USER_SIGNED_ACTIONS.userSetAbstraction.payloadTypes,
      USER_SIGNED_ACTIONS.userSetAbstraction.primaryType,
      false,
    );
    const payload = prepared.action.payload as {
      action: { abstraction: string };
    };
    expect(payload.action.abstraction).toBe('i');
    expect(action.abstraction).toBe('disabled');
  });
});
