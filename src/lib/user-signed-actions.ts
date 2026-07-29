import type {
  TypedDataField,
  UserSignedActionDefinition,
} from '../types/shared.types.js';

function define(
  primaryType: string,
  payloadTypes: TypedDataField[],
): UserSignedActionDefinition {
  return { payloadTypes, primaryType };
}

const CHAIN = { name: 'hyperliquidChain', type: 'string' };
const NONCE = { name: 'nonce', type: 'uint64' };
const TIME = { name: 'time', type: 'uint64' };

export const USER_SIGNED_ACTIONS = {
  approveAgent: define('HyperliquidTransaction:ApproveAgent', [
    CHAIN,
    { name: 'agentAddress', type: 'address' },
    { name: 'agentName', type: 'string' },
    NONCE,
  ]),
  approveBuilderFee: define('HyperliquidTransaction:ApproveBuilderFee', [
    CHAIN,
    { name: 'maxFeeRate', type: 'string' },
    { name: 'builder', type: 'address' },
    NONCE,
  ]),
  cDeposit: define('HyperliquidTransaction:CDeposit', [
    CHAIN,
    { name: 'wei', type: 'uint64' },
    NONCE,
  ]),
  cWithdraw: define('HyperliquidTransaction:CWithdraw', [
    CHAIN,
    { name: 'wei', type: 'uint64' },
    NONCE,
  ]),
  convertToMultiSigUser: define(
    'HyperliquidTransaction:ConvertToMultiSigUser',
    [CHAIN, { name: 'signers', type: 'string' }, NONCE],
  ),
  linkStakingUser: define('HyperliquidTransaction:LinkStakingUser', [
    CHAIN,
    { name: 'user', type: 'address' },
    { name: 'isFinalize', type: 'bool' },
    NONCE,
  ]),
  sendAsset: define('HyperliquidTransaction:SendAsset', [
    CHAIN,
    { name: 'destination', type: 'string' },
    { name: 'sourceDex', type: 'string' },
    { name: 'destinationDex', type: 'string' },
    { name: 'token', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'fromSubAccount', type: 'string' },
    NONCE,
  ]),
  sendToEvmWithData: define('HyperliquidTransaction:SendToEvmWithData', [
    CHAIN,
    { name: 'token', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'sourceDex', type: 'string' },
    { name: 'destinationRecipient', type: 'string' },
    { name: 'addressEncoding', type: 'string' },
    { name: 'destinationChainId', type: 'uint32' },
    { name: 'gasLimit', type: 'uint64' },
    { name: 'data', type: 'bytes' },
    NONCE,
  ]),
  spotSend: define('HyperliquidTransaction:SpotSend', [
    CHAIN,
    { name: 'destination', type: 'string' },
    { name: 'token', type: 'string' },
    { name: 'amount', type: 'string' },
    TIME,
  ]),
  stakingLinkDisableTradingUser: define(
    'HyperliquidTransaction:StakingLinkDisableTradingUser',
    [CHAIN, { name: 'tradingUser', type: 'address' }, NONCE],
  ),
  tokenDelegate: define('HyperliquidTransaction:TokenDelegate', [
    CHAIN,
    { name: 'validator', type: 'address' },
    { name: 'wei', type: 'uint64' },
    { name: 'isUndelegate', type: 'bool' },
    NONCE,
  ]),
  usdClassTransfer: define('HyperliquidTransaction:UsdClassTransfer', [
    CHAIN,
    { name: 'amount', type: 'string' },
    { name: 'toPerp', type: 'bool' },
    NONCE,
  ]),
  usdSend: define('HyperliquidTransaction:UsdSend', [
    CHAIN,
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    TIME,
  ]),
  userDexAbstraction: define('HyperliquidTransaction:UserDexAbstraction', [
    CHAIN,
    { name: 'user', type: 'address' },
    { name: 'enabled', type: 'bool' },
    NONCE,
  ]),
  userPortfolioMargin: define('HyperliquidTransaction:UserPortfolioMargin', [
    CHAIN,
    { name: 'user', type: 'address' },
    { name: 'enabled', type: 'bool' },
    NONCE,
  ]),
  userSetAbstraction: define('HyperliquidTransaction:UserSetAbstraction', [
    CHAIN,
    { name: 'user', type: 'address' },
    { name: 'abstraction', type: 'string' },
    NONCE,
  ]),
  withdraw: define('HyperliquidTransaction:Withdraw', [
    CHAIN,
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    TIME,
  ]),
} as const;
