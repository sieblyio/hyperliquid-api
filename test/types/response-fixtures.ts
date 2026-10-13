// Selected public Info/WS responses captured on 2026-10-13.
// Wire values deliberately remain strings, including amounts in the WS payloads.
// https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
// https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions
// Undocumented Info shapes were cross-checked against the community SDK:
// https://github.com/nktkas/hyperliquid/tree/db80d598f6e4672edc090fe69994ecec97ebc980/src/api/info/_methods
import type * as SDK from '../../src/index.js';

// Empty responses and published variants that do not require a funded account.
void (null satisfies Awaited<ReturnType<SDK.RestClient['getMultiSigSigners']>>);
void (null satisfies Awaited<
  ReturnType<SDK.RestClient['getSubAccountsWithAllDexStates']>
>);
void (null satisfies Awaited<ReturnType<SDK.RestClient['getVaultDetails']>>);
void ({ type: 'normal' } satisfies SDK.VaultRelationship);
void ({ type: 'child' } satisfies SDK.VaultRelationship);
void ({
  type: 'parent',
  data: { childAddresses: [] },
} satisfies SDK.VaultRelationship);
void ({ stage: 'needToCreateCode' } satisfies SDK.ReferrerState);
void ({
  address: '0x0',
  name: 'No expiry',
  validUntil: null,
} satisfies SDK.ExtraAgent);

const twapState = {
  coin: 'BTC',
  executedNtl: '100.0',
  executedSz: '0.001',
  minutes: 5,
  randomize: false,
  reduceOnly: false,
  side: 'B',
  sz: '0.001',
  timestamp: 1700000000000,
  user: '0x0000000000000000000000000000000000000001',
} satisfies SDK.TwapState;
void ({
  state: twapState,
  status: { status: 'finished' },
  time: 1700000000,
} satisfies SDK.TwapHistoryEntry);
void ({
  state: { ...twapState, trigger: null, stopPx: null },
  status: { status: 'error', description: 'Insufficient margin' },
  time: 1700000000,
  twapId: 1,
} satisfies SDK.TwapHistoryEntry);
// @ts-expect-error Error statuses carry a description.
void ({ status: 'error' } satisfies SDK.TwapStatus);
void ({
  status: 'ok',
  response: { type: 'createSubAccount', data: '0x0' },
} satisfies SDK.ExchangeResponse<string>);
void ({
  status: 'err',
  response: 'Unable to create vault',
} satisfies SDK.ExchangeResponse<string>);
void ({
  status: 'ok',
  // @ts-expect-error Successful address responses require their data.
  response: { type: 'createVault' },
} satisfies SDK.ExchangeResponse<string>);

void ([
  ['54.64.2.87', null],
  [
    {
      startTimeSeconds: 1791898380,
      durationSeconds: 180,
      startGas: '20.461393',
      currentGas: '11.33779215',
      endGas: null,
    },
    {
      startTimeSeconds: 1791898380,
      durationSeconds: 180,
      startGas: '0.1',
      currentGas: null,
      endGas: '0.1',
    },
  ],
] satisfies SDK.GossipPriorityAuctionStatus);

void ({
  name: 'A',
  address: '0x5402505e92832dbe1847aeb559e5d6756b798c6c',
  validUntil: 1793808835032,
} satisfies SDK.ExtraAgent);

void ({
  coin: 'BTC',
  side: 'A',
  px: '83315.0',
  sz: '0.00231',
  time: 1791898463051,
  hash: '0xf95e6509ca986872fad80446792beb02109200ef659b87459d27105c899c425d',
  tid: 9162767329426,
  users: [
    '0x6be2564feecd30ed141696dd4cbbb27f2abf570c',
    '0x30ded4471abb422a72f1f00399ae775a638acef1',
  ],
} satisfies SDK.Trade);

void ({
  coin: 'BTC',
  ctx: {
    funding: '0.0000055563',
    openInterest: '38364.67282',
    prevDayPx: '82675.0',
    dayNtlVlm: '3046400655.0273604393',
    premium: '-0.0003721578',
    oraclePx: '83298.0',
    markPx: '83258.8',
    midPx: '83266.5',
    impactPxs: ['83266.0', '83267.0'],
    dayBaseVlm: '36807.86371',
  },
} satisfies SDK.ActivePerpAssetContextEvent);

void ({
  coin: '@107',
  ctx: {
    prevDayPx: '84.961',
    dayNtlVlm: '78249885.589749977',
    markPx: '81.177',
    midPx: '81.1775',
    circulatingSupply: '302135672.7581518888',
    coin: '@107',
    totalSupply: '998862472.3129349947',
    dayBaseVlm: '948365.6700000004',
  },
} satisfies SDK.ActiveSpotAssetContextEvent);

void ({
  time: 1741870078654,
  hash: '0x56b87c2765b1deac948a041f78e34c01670014135e61e38897dd77909ec31cbd',
  delta: {
    type: 'vaultWithdraw',
    vault: '0x010461c14e146ac35fe42271bdc1134ee31c703a',
    user: '0xdfc24b077bc1425ad1dea75bcb6f8158e10df303',
    requestedUsd: '1868301.8195090001',
    commission: '0.0',
    closingCost: '0.0',
    basis: '1884217.2789950001',
    netWithdrawnUsd: '1868301.8195090001',
  },
} satisfies SDK.UserNonFundingLedgerUpdate);

void ({
  validator: '0x000000000056f99d36b6f2e0c51fd41496bbacb8',
  signer: '0x0000000008b0b558419582041f85740344ae8fde',
  name: 'ValiDAO',
  description:
    'The People\u2019s Validator. Zero seed oils. Yours truly. https://validao.xyz',
  nRecentBlocks: 1,
  stake: 639805763531461,
  isJailed: false,
  unjailableAfter: null,
  isActive: true,
  commission: '0.04',
  stats: [
    [
      'day',
      {
        uptimeFraction: '1.0',
        predictedApr: '0.0214619724',
        nSamples: 1440,
      },
    ],
    [
      'week',
      {
        uptimeFraction: '1.0',
        predictedApr: '0.0214619724',
        nSamples: 10080,
      },
    ],
    [
      'month',
      {
        uptimeFraction: '1.0',
        predictedApr: '0.0214619724',
        nSamples: 43199,
      },
    ],
  ],
} satisfies SDK.ValidatorSummary);
