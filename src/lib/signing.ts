import { encode } from '@msgpack/msgpack';
import {
  getAddress,
  getBytes,
  keccak256,
  Signature as EthersSignature,
  Wallet,
} from 'ethers';

import {
  L1_SIGNATURE_CHAIN_ID,
  USER_SIGNED_SIGNATURE_CHAIN_ID,
  ZERO_ADDRESS,
} from '../constants.js';
import type {
  HyperliquidSigner,
  JsonObject,
  Signature,
  TypedDataField,
  TypedDataTypes,
} from '../types/shared.types.js';

const AGENT_TYPES: TypedDataField[] = [
  { name: 'source', type: 'string' },
  { name: 'connectionId', type: 'bytes32' },
];

export function createPrivateKeySigner(privateKey: string): HyperliquidSigner {
  return new Wallet(privateKey);
}

export function normalizeAddress(address: string): string {
  const normalizedPrefix = address.startsWith('0X')
    ? `0x${address.slice(2)}`
    : address;
  return getAddress(normalizedPrefix).toLowerCase();
}

export async function getSignerAddress(
  signer: HyperliquidSigner,
): Promise<string> {
  const address = signer.getAddress
    ? await signer.getAddress()
    : signer.address;

  if (!address) {
    throw new TypeError(
      'An external signer must expose address or getAddress().',
    );
  }

  return normalizeAddress(address);
}

function uint64ToBytes(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      'Hyperliquid timestamps and nonces must be non-negative safe integers.',
    );
  }

  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false);
  return bytes;
}

function concatenateBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

export function actionHash(
  action: unknown,
  vaultAddress: string | undefined,
  nonce: number,
  expiresAfter?: number,
): string {
  const encodedAction = encode(action);
  const vaultBytes = vaultAddress
    ? concatenateBytes([
        new Uint8Array([1]),
        getBytes(normalizeAddress(vaultAddress)),
      ])
    : new Uint8Array([0]);
  const expiryBytes =
    expiresAfter === undefined
      ? new Uint8Array()
      : concatenateBytes([new Uint8Array([0]), uint64ToBytes(expiresAfter)]);

  return keccak256(
    concatenateBytes([
      encodedAction,
      uint64ToBytes(nonce),
      vaultBytes,
      expiryBytes,
    ]),
  );
}

export function splitSignature(signature: string): Signature {
  const parsed = EthersSignature.from(signature);

  return {
    r: parsed.r,
    s: parsed.s,
    v: parsed.v,
  };
}

export function trimSignature(signature: Signature): Signature {
  return {
    r: signature.r.replace(/^0x0+/, '0x'),
    s: signature.s.replace(/^0x0+/, '0x'),
    v: signature.v,
  };
}

export async function signL1Action(
  signer: HyperliquidSigner,
  action: unknown,
  vaultAddress: string | undefined,
  nonce: number,
  expiresAfter: number | undefined,
  isMainnet: boolean,
): Promise<Signature> {
  const connectionId = actionHash(action, vaultAddress, nonce, expiresAfter);
  const signature = await signer.signTypedData(
    {
      chainId: L1_SIGNATURE_CHAIN_ID,
      name: 'Exchange',
      verifyingContract: ZERO_ADDRESS,
      version: '1',
    },
    { Agent: AGENT_TYPES },
    {
      source: isMainnet ? 'a' : 'b',
      connectionId,
    },
  );

  return splitSignature(signature);
}

export interface SignedMultiSigAction {
  action: JsonObject;
  signature: Signature;
}

async function signMultiSigOuter(
  leader: HyperliquidSigner,
  wrapper: JsonObject,
  nonce: number,
  vaultAddress: string | undefined,
  expiresAfter: number | undefined,
  isMainnet: boolean,
): Promise<Signature> {
  const wrapperWithoutType = {
    signatureChainId: wrapper.signatureChainId,
    signatures: wrapper.signatures,
    payload: wrapper.payload,
  };
  const multiSigActionHash = actionHash(
    wrapperWithoutType,
    vaultAddress,
    nonce,
    expiresAfter,
  );
  const signature = await leader.signTypedData(
    {
      chainId: Number.parseInt(USER_SIGNED_SIGNATURE_CHAIN_ID, 16),
      name: 'HyperliquidSignTransaction',
      verifyingContract: ZERO_ADDRESS,
      version: '1',
    },
    {
      'HyperliquidTransaction:SendMultiSig': [
        { name: 'hyperliquidChain', type: 'string' },
        { name: 'multiSigActionHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint64' },
      ],
    },
    {
      hyperliquidChain: isMainnet ? 'Mainnet' : 'Testnet',
      multiSigActionHash,
      nonce,
    },
  );

  return splitSignature(signature);
}

export async function signMultiSigL1Action(
  signers: readonly [HyperliquidSigner, ...HyperliquidSigner[]],
  multiSigUser: string,
  action: JsonObject,
  nonce: number,
  vaultAddress: string | undefined,
  expiresAfter: number | undefined,
  isMainnet: boolean,
): Promise<SignedMultiSigAction> {
  const outerSigner = await getSignerAddress(signers[0]);
  const normalizedMultiSigUser = normalizeAddress(multiSigUser);
  const innerSignatures = await Promise.all(
    signers.map(async (signer) =>
      trimSignature(
        await signL1Action(
          signer,
          [normalizedMultiSigUser, outerSigner, action],
          vaultAddress,
          nonce,
          expiresAfter,
          isMainnet,
        ),
      ),
    ),
  );
  const wrapper: JsonObject = {
    type: 'multiSig',
    signatureChainId: USER_SIGNED_SIGNATURE_CHAIN_ID,
    signatures: innerSignatures,
    payload: {
      multiSigUser: normalizedMultiSigUser,
      outerSigner,
      action,
    },
  };
  const outerSignature = await signMultiSigOuter(
    signers[0],
    wrapper,
    nonce,
    vaultAddress,
    expiresAfter,
    isMainnet,
  );

  return {
    action: wrapper,
    signature: outerSignature,
  };
}

export interface PreparedUserSignedAction {
  action: Record<string, unknown>;
  signature: Signature;
}

function normalizeTypedDataAddresses(value: unknown): unknown {
  if (typeof value === 'string') {
    return /^0x[0-9a-f]{40}$/i.test(value) ? normalizeAddress(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeTypedDataAddresses);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeTypedDataAddresses(entry),
      ]),
    );
  }
  return value;
}

function canonicalUserSignedAction(
  action: Record<string, unknown>,
  payloadTypes: TypedDataField[],
  isMainnet: boolean,
): Record<string, unknown> {
  const normalized = normalizeTypedDataAddresses(action) as Record<
    string,
    unknown
  >;
  const type = normalized.type;
  if (typeof type !== 'string') {
    throw new TypeError('A user-signed action must have a string type.');
  }

  const ordered: Record<string, unknown> = {
    type,
    signatureChainId: USER_SIGNED_SIGNATURE_CHAIN_ID,
    hyperliquidChain: isMainnet ? 'Mainnet' : 'Testnet',
  };
  const signedFields = new Set(['hyperliquidChain']);
  for (const field of payloadTypes) {
    signedFields.add(field.name);
    if (field.name !== 'hyperliquidChain' && field.name in normalized) {
      ordered[field.name] = normalized[field.name];
    }
  }

  for (const field of Object.keys(normalized)) {
    if (
      field !== 'type' &&
      field !== 'signatureChainId' &&
      field !== 'hyperliquidChain' &&
      !signedFields.has(field)
    ) {
      throw new TypeError(
        `User-signed action field "${field}" is not included in its EIP-712 definition.`,
      );
    }
  }

  return ordered;
}

export async function signUserSignedAction(
  signer: HyperliquidSigner,
  action: Record<string, unknown>,
  payloadTypes: TypedDataField[],
  primaryType: string,
  isMainnet: boolean,
  multiSig?: {
    outerSigner: string;
    payloadMultiSigUser: string;
  },
): Promise<PreparedUserSignedAction> {
  const canonicalAction = canonicalUserSignedAction(
    action,
    payloadTypes,
    isMainnet,
  );
  let preparedAction = canonicalAction;
  const preparedTypes = [...payloadTypes];

  if (multiSig) {
    const chainFieldIndex = preparedTypes.findIndex(
      (field) => field.name === 'hyperliquidChain',
    );

    if (chainFieldIndex < 0) {
      throw new TypeError(
        'A multisig user-signed action must include hyperliquidChain in its typed data fields.',
      );
    }

    preparedTypes.splice(
      chainFieldIndex + 1,
      0,
      { name: 'payloadMultiSigUser', type: 'address' },
      { name: 'outerSigner', type: 'address' },
    );
    const { type, signatureChainId, hyperliquidChain, ...actionFields } =
      canonicalAction;
    preparedAction = {
      type,
      signatureChainId,
      hyperliquidChain,
      payloadMultiSigUser: normalizeAddress(multiSig.payloadMultiSigUser),
      outerSigner: normalizeAddress(multiSig.outerSigner),
      ...actionFields,
    };
  }

  const types: TypedDataTypes = {
    [primaryType]: preparedTypes,
  };
  const signature = await signer.signTypedData(
    {
      chainId: Number.parseInt(USER_SIGNED_SIGNATURE_CHAIN_ID, 16),
      name: 'HyperliquidSignTransaction',
      verifyingContract: ZERO_ADDRESS,
      version: '1',
    },
    types,
    preparedAction,
  );

  return {
    action: preparedAction,
    signature: splitSignature(signature),
  };
}

export async function signMultiSigUserSignedAction(
  signers: readonly [HyperliquidSigner, ...HyperliquidSigner[]],
  multiSigUser: string,
  action: Record<string, unknown>,
  payloadTypes: TypedDataField[],
  primaryType: string,
  isMainnet: boolean,
  payloadAction?: Record<string, unknown>,
): Promise<SignedMultiSigAction> {
  const outerSigner = await getSignerAddress(signers[0]);
  const normalizedMultiSigUser = normalizeAddress(multiSigUser);
  const prepared = await Promise.all(
    signers.map((signer) =>
      signUserSignedAction(
        signer,
        action,
        payloadTypes,
        primaryType,
        isMainnet,
        {
          outerSigner,
          payloadMultiSigUser: normalizedMultiSigUser,
        },
      ),
    ),
  );
  let fullPayloadAction = canonicalUserSignedAction(
    payloadAction ?? action,
    payloadTypes,
    isMainnet,
  );
  if (fullPayloadAction.type === 'userSetAbstraction') {
    const abstractionCodes: Record<string, string> = {
      disabled: 'i',
      portfolioMargin: 'p',
      unifiedAccount: 'u',
    };
    const abstraction = fullPayloadAction.abstraction;
    if (typeof abstraction === 'string' && abstractionCodes[abstraction]) {
      fullPayloadAction = {
        ...fullPayloadAction,
        abstraction: abstractionCodes[abstraction],
      };
    }
  }
  const wrapper: JsonObject = {
    type: 'multiSig',
    signatureChainId: USER_SIGNED_SIGNATURE_CHAIN_ID,
    signatures: prepared.map(({ signature }) => trimSignature(signature)),
    payload: {
      multiSigUser: normalizedMultiSigUser,
      outerSigner,
      action: fullPayloadAction,
    },
  };
  const nonceValue = action.nonce ?? action.time;
  if (
    typeof nonceValue !== 'number' ||
    !Number.isSafeInteger(nonceValue) ||
    nonceValue < 0
  ) {
    throw new TypeError(
      'A multi-sig user-signed action must contain a valid nonce or time.',
    );
  }

  return {
    action: wrapper,
    signature: await signMultiSigOuter(
      signers[0],
      wrapper,
      nonceValue,
      undefined,
      undefined,
      isMainnet,
    ),
  };
}
