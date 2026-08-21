import type {
  AssetIdentifier,
  CancelByCloidWireInput,
  CancelWireInput,
  Grouping,
  ModifyWireInput,
  OrderWireInput,
} from '../../lib/action-factory.js';
import type {
  HyperliquidSigner,
  JsonObject,
  L1ActionOptions,
  RequestOptions,
  UserSignedActionOptions,
} from '../shared.types.js';

export interface L1RequestOptions extends RequestOptions {
  expiresAfter?: number;
  vaultAddress?: string | null;
}

export type UserSignedRequestOptions = RequestOptions;

export interface RawL1RequestOptions extends L1ActionOptions, RequestOptions {}

export interface RawUserSignedRequestOptions
  extends UserSignedActionOptions, RequestOptions {}

export interface MultiSigL1RequestOptions extends RawL1RequestOptions {
  multiSigUser: string;
  signers: readonly [HyperliquidSigner, ...HyperliquidSigner[]];
}

export interface MultiSigUserSignedRequestOptions extends RawUserSignedRequestOptions {
  multiSigUser: string;
  signers: readonly [HyperliquidSigner, ...HyperliquidSigner[]];
}

export interface SubmitOrderRequest {
  grouping?: Grouping;
  orders: OrderWireInput[];
}

export type OrderSide = 'buy' | 'sell';

export interface SubmitMarketOrderRequest {
  clientOrderId?: string;
  maxSlippage?: number;
  reduceOnly?: boolean;
  side: OrderSide;
  size: string;
  symbol: AssetIdentifier;
}

export interface SubmitLimitOrderRequest {
  clientOrderId?: string;
  postOnly?: boolean;
  price: string;
  reduceOnly?: boolean;
  side: OrderSide;
  size: string;
  symbol: AssetIdentifier;
  timeInForce?: 'GTC' | 'IOC';
}

export interface ModifyOrderRequest extends ModifyWireInput {
  alwaysPlace?: true;
}

export interface ModifyOrdersRequest {
  alwaysPlace?: true;
  modifies: ModifyWireInput[];
}

export interface CancelOrdersRequest {
  cancels: CancelWireInput[];
  fastCancel?: true;
}

export interface CancelOrdersByClientOrderIdRequest {
  cancels: CancelByCloidWireInput[];
  fastCancel?: true;
}

export interface UpdateLeverageRequest {
  asset: AssetIdentifier;
  isCross: boolean;
  leverage: number;
}

export interface UpdateIsolatedMarginRequest {
  asset: AssetIdentifier;
  isBuy: boolean;
  ntli: number;
}

export interface SetIsolatedMarginLeverageRequest {
  asset: AssetIdentifier;
  leverage: string;
}

export interface SubmitTwapOrderRequest {
  a: AssetIdentifier;
  b: boolean;
  m: number;
  r: boolean;
  s: string;
  t: boolean;
}

export interface CancelTwapOrderRequest {
  a: AssetIdentifier;
  t: number;
}

export interface TransferUsdToOrFromSubAccountRequest {
  isDeposit: boolean;
  subAccountUser: string;
  usd: number;
}

export interface TransferSpotToOrFromSubAccountRequest {
  amount: string;
  isDeposit: boolean;
  subAccountUser: string;
  token: string;
}

export interface TransferVaultFundsRequest {
  isDeposit: boolean;
  usd: number;
  vaultAddress: string;
}

export interface SendAssetRequest {
  amount: string;
  destination: string;
  destinationDex: string;
  fromSubAccount?: string;
  sourceDex: string;
  token: string;
}

export type SendAssetFromApiWalletRequest = SendAssetRequest;

export interface SendUsdRequest {
  amount: string;
  destination: string;
}

export interface SendSpotAssetRequest extends SendUsdRequest {
  token: string;
}

export type WithdrawUsdRequest = SendUsdRequest;

export interface TransferUsdBetweenSpotAndPerpRequest {
  amount: string;
  toPerp: boolean;
}

export interface SendToEvmWithDataRequest {
  addressEncoding: 'base58' | 'hex';
  amount: string;
  data: string;
  destinationChainId: number;
  destinationRecipient: string;
  gasLimit: number;
  sourceDex: string;
  token: string;
}

export interface ApproveApiWalletRequest {
  agentAddress: string;
  agentName?: string | null;
}

export interface ConvertToMultiSigUserRequest {
  signers: {
    authorizedUsers: string[];
    threshold: number;
  } | null;
}

export interface DelegateOrUndelegateStakeRequest {
  isUndelegate: boolean;
  validator: string;
  wei: number;
}

export interface LinkStakingAccountRequest {
  isFinalize: boolean;
  user: string;
}

export interface UserToggleRequest {
  enabled: boolean;
  user: string;
}

export interface SetUserAbstractionRequest {
  abstraction: 'disabled' | 'portfolioMargin' | 'unifiedAccount';
  user: string;
}

export type DeployPerpRequest = Omit<JsonObject, 'type'>;
export type DeploySpotRequest = Omit<JsonObject, 'type'>;
export type SubmitUserOutcomeRequest = Omit<JsonObject, 'type'>;
