import type {
  ExchangeRequestEnvelope,
  HyperliquidSigner,
  JsonObject,
  L1ActionOptions,
  NonceProvider,
  RestClientOptions,
  UserSignedActionDefinition,
  UserSignedActionOptions,
} from '../types/shared.types.js';
import { ActionFactory } from './action-factory.js';
import type { AssetResolver } from './asset-resolver.js';
import { getNextNonce, sharedNonceManager } from './nonce-manager.js';
import { normalizeAddresses } from './normalize-addresses.js';
import {
  getPartnerConfiguration,
  type PartnerConfiguration,
} from './request-utils.js';
import {
  createPrivateKeySigner,
  getSignerAddress,
  normalizeAddress,
  signL1Action,
  signMultiSigL1Action,
  signMultiSigUserSignedAction,
  signUserSignedAction,
} from './signing.js';
import { sanitizeObjectForWire } from './wire.js';

export class ActionBuilder {
  readonly actions: ActionFactory;

  private builderFeeApproved = false;

  private readonly configuredAccountAddress: string | undefined;

  private readonly configuredVaultAddress: string | undefined;

  private readonly isMainnet: boolean;

  private readonly nonceProvider: NonceProvider;

  private readonly signer: HyperliquidSigner | undefined;

  private readonly signerUsesPrivateKey: boolean;

  private signerAddressPromise?: Promise<string>;

  constructor(assetResolver: AssetResolver, options: RestClientOptions = {}) {
    if (options.privateKey !== undefined && options.signer) {
      throw new TypeError('Provide either privateKey or signer, not both.');
    }

    this.signerUsesPrivateKey = options.privateKey !== undefined;
    this.signer =
      options.privateKey !== undefined
        ? createPrivateKeySigner(options.privateKey)
        : options.signer;
    this.configuredAccountAddress = options.accountAddress
      ? normalizeAddress(options.accountAddress)
      : undefined;
    this.configuredVaultAddress = options.vaultAddress
      ? normalizeAddress(options.vaultAddress)
      : undefined;
    this.isMainnet = options.testnet !== true;
    this.nonceProvider = options.nonceProvider ?? sharedNonceManager;
    this.actions = new ActionFactory(assetResolver, () =>
      this.builderFeeApproved ? this.partnerConfiguration().builder : undefined,
    );
  }

  async prepareL1Action<Action extends JsonObject>(
    action: Action,
    options: L1ActionOptions = {},
  ): Promise<ExchangeRequestEnvelope<JsonObject>> {
    this.partnerConfiguration();
    const signer = this.requireSigner();
    const signerAddress = await this.signerAddress();
    const nonce =
      options.nonce ?? (await getNextNonce(this.nonceProvider, signerAddress));
    const vaultAddress =
      options.vaultAddress === undefined
        ? this.configuredVaultAddress
        : options.vaultAddress
          ? normalizeAddress(options.vaultAddress)
          : undefined;
    const canonicalAction = await this.actions.canonicalizeRaw(action);
    if ('nonce' in canonicalAction) {
      canonicalAction.nonce = nonce;
    }
    const signature = await signL1Action(
      signer,
      canonicalAction,
      vaultAddress,
      nonce,
      options.expiresAfter,
      this.isMainnet,
    );

    return {
      action: canonicalAction,
      expiresAfter: options.expiresAfter ?? null,
      nonce,
      signature,
      vaultAddress: vaultAddress ?? null,
    };
  }

  async prepareUserSignedAction(
    action: JsonObject,
    definition: UserSignedActionDefinition,
    options: UserSignedActionOptions = {},
  ): Promise<ExchangeRequestEnvelope<Record<string, unknown>>> {
    this.partnerConfiguration();
    const signer = this.requireSigner();
    const signerAddress = await this.signerAddress();
    const nonce =
      options.nonce ?? (await getNextNonce(this.nonceProvider, signerAddress));
    const actionWithNonce = normalizeAddresses(sanitizeObjectForWire(action));

    if ('nonce' in actionWithNonce) {
      actionWithNonce.nonce = nonce;
    } else if ('time' in actionWithNonce) {
      actionWithNonce.time = nonce;
    } else {
      throw new TypeError(
        'A raw user-signed action must contain a nonce or time field.',
      );
    }

    const multiSig =
      options.payloadMultiSigUser || options.outerSigner
        ? {
            payloadMultiSigUser:
              options.payloadMultiSigUser ||
              this.configuredAccountAddress ||
              signerAddress,
            outerSigner: options.outerSigner || signerAddress,
          }
        : undefined;
    const prepared = await signUserSignedAction(
      signer,
      actionWithNonce,
      definition.payloadTypes,
      definition.primaryType,
      this.isMainnet,
      multiSig,
    );

    return {
      action: prepared.action,
      expiresAfter: null,
      nonce,
      signature: prepared.signature,
      vaultAddress: null,
    };
  }

  async prepareMultiSigL1Action(
    action: JsonObject,
    signers: readonly [HyperliquidSigner, ...HyperliquidSigner[]],
    multiSigUser: string,
    options: L1ActionOptions = {},
  ): Promise<ExchangeRequestEnvelope<JsonObject>> {
    this.partnerConfiguration();
    const signerAddress = await getSignerAddress(signers[0]);
    const nonce =
      options.nonce ?? (await getNextNonce(this.nonceProvider, signerAddress));
    const vaultAddress =
      options.vaultAddress === undefined
        ? this.configuredVaultAddress
        : options.vaultAddress
          ? normalizeAddress(options.vaultAddress)
          : undefined;
    const canonicalAction = await this.actions.canonicalizeRaw(action);
    if ('nonce' in canonicalAction) {
      canonicalAction.nonce = nonce;
    }
    const prepared = await signMultiSigL1Action(
      signers,
      multiSigUser,
      canonicalAction,
      nonce,
      vaultAddress,
      options.expiresAfter,
      this.isMainnet,
    );

    return {
      action: prepared.action,
      expiresAfter: options.expiresAfter ?? null,
      nonce,
      signature: prepared.signature,
      vaultAddress: vaultAddress ?? null,
    };
  }

  async prepareMultiSigUserSignedAction(
    action: JsonObject,
    definition: UserSignedActionDefinition,
    signers: readonly [HyperliquidSigner, ...HyperliquidSigner[]],
    multiSigUser: string,
    options: UserSignedActionOptions = {},
  ): Promise<ExchangeRequestEnvelope<JsonObject>> {
    this.partnerConfiguration();
    const signerAddress = await getSignerAddress(signers[0]);
    const nonce =
      options.nonce ?? (await getNextNonce(this.nonceProvider, signerAddress));
    const actionWithNonce = normalizeAddresses(sanitizeObjectForWire(action));

    if ('nonce' in actionWithNonce) {
      actionWithNonce.nonce = nonce;
    } else if ('time' in actionWithNonce) {
      actionWithNonce.time = nonce;
    } else {
      throw new TypeError(
        'A raw user-signed action must contain a nonce or time field.',
      );
    }

    const prepared = await signMultiSigUserSignedAction(
      signers,
      multiSigUser,
      actionWithNonce,
      definition.payloadTypes,
      definition.primaryType,
      this.isMainnet,
    );

    return {
      action: prepared.action,
      expiresAfter: null,
      nonce,
      signature: prepared.signature,
      vaultAddress: null,
    };
  }

  configuredAccount(): string | undefined {
    return this.configuredAccountAddress;
  }

  configuredVault(): string | undefined {
    return this.configuredVaultAddress;
  }

  confirmBuilderFeeApproval(): void {
    this.builderFeeApproved = true;
  }

  clearBuilderFeeApproval(): void {
    this.builderFeeApproved = false;
  }

  hasSigner(): boolean {
    return this.signer !== undefined;
  }

  usesPrivateKeySigner(): boolean {
    return this.signerUsesPrivateKey;
  }

  async signerAddress(): Promise<string> {
    if (!this.signerAddressPromise) {
      this.signerAddressPromise = getSignerAddress(this.requireSigner());
    }

    return this.signerAddressPromise;
  }

  partnerConfiguration(): PartnerConfiguration {
    return getPartnerConfiguration();
  }

  private requireSigner(): HyperliquidSigner {
    if (!this.signer) {
      throw new Error(
        'This operation requires privateKey or an external signTypedData signer.',
      );
    }

    return this.signer;
  }
}
