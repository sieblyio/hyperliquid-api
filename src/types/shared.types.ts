import type { AxiosRequestConfig } from 'axios';

export type HyperliquidNetwork = 'mainnet' | 'testnet';
export type HyperliquidChain = 'Mainnet' | 'Testnet';

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, unknown>;

export interface Signature {
  r: string;
  s: string;
  v: number;
}

export interface TypedDataField {
  name: string;
  type: string;
}

export interface TypedDataDomain {
  chainId: bigint | number | string;
  name: string;
  verifyingContract: string;
  version: string;
}

export type TypedDataTypes = Record<string, TypedDataField[]>;

/**
 * Portable signer contract used by the SDK.
 *
 * ethers Wallet and most browser wallet adapters already satisfy this shape.
 */
export interface HyperliquidSigner {
  address?: string;
  getAddress?: () => Promise<string> | string;
  signTypedData: (
    domain: TypedDataDomain,
    types: TypedDataTypes,
    value: Record<string, unknown>,
  ) => Promise<string>;
}

export interface NonceProvider {
  nextNonce(signerAddress: string): Promise<number> | number;
}

export type RequestOptions = Omit<
  AxiosRequestConfig,
  'data' | 'method' | 'url'
>;

export interface RestClientOptions {
  accountAddress?: string;
  assetCacheTtlMs?: number;
  baseUrl?: string;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  nonceProvider?: NonceProvider;
  parseExceptions?: boolean;
  privateKey?: string;
  signer?: HyperliquidSigner;
  testnet?: boolean;
  timeout?: number;
  vaultAddress?: string;
}

export interface ExchangeRequestEnvelope<Action = JsonObject> {
  action: Action;
  expiresAfter: number | null;
  nonce: number;
  signature: Signature;
  vaultAddress: string | null;
}

export interface BuilderCode {
  b: string;
  f: number;
}

export interface UserSignedActionDefinition {
  payloadTypes: TypedDataField[];
  primaryType: string;
}

export interface UserSignedActionInput {
  [key: string]: unknown;
  type: string;
}

export interface UserSignedActionOptions {
  nonce?: number;
  payloadMultiSigUser?: string;
  outerSigner?: string;
}

export interface L1ActionOptions {
  expiresAfter?: number;
  nonce?: number;
  vaultAddress?: string | null;
}
