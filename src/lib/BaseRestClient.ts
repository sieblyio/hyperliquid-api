import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from 'axios';

import { DEFAULT_REQUEST_TIMEOUT_MS } from '../constants.js';
import type {
  L1RequestOptions,
  MultiSigL1RequestOptions,
  MultiSigUserSignedRequestOptions,
  RawL1RequestOptions,
  RawUserSignedRequestOptions,
  UserSignedRequestOptions,
} from '../types/request/exchange.types.js';
import type { ExchangeResponse } from '../types/response/exchange.types.js';
import type {
  InfoResponse,
  UserRoleResponse,
} from '../types/response/info.types.js';
import type {
  JsonObject,
  RestClientNetworkOptions,
  RestClientOptions,
  UserSignedActionDefinition,
} from '../types/shared.types.js';
import { AccountResolver } from './account-resolver.js';
import { ActionBuilder } from './action-builder.js';
import { AssetResolver } from './asset-resolver.js';
import { HyperliquidApiError } from './errors.js';
import {
  configureHttpsKeepAlive,
  DEFAULT_REQUEST_HEADERS,
} from './https-agent.js';
import { normalizeAddresses } from './normalize-addresses.js';
import { buildUserSignedAction } from './request-utils.js';
import { USER_SIGNED_ACTIONS } from './user-signed-actions.js';
import { sanitizeObjectForWire } from './wire.js';

type ActionSubmissionOptions =
  | MultiSigL1RequestOptions
  | MultiSigUserSignedRequestOptions
  | RawL1RequestOptions
  | RawUserSignedRequestOptions;

type BuilderApprovalState =
  'approved' | 'checking' | 'unapproved' | 'unavailable' | 'unchecked';

interface BuilderApprovalOwner {
  address: string;
  canAutoApprove: boolean;
}

const BUILDER_APPROVAL_PREFLIGHT_BUDGET_MS = 1_000;

const TRADING_ACTIONS = new Set([
  'batchModify',
  'cancel',
  'cancelByCloid',
  'modify',
  'order',
  'scheduleCancel',
  'twapCancel',
  'twapOrder',
]);

interface HyperliquidErrorResponse {
  response?: string;
  status: 'err';
}

function isHyperliquidErrorResponse(
  value: unknown,
): value is HyperliquidErrorResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    'status' in value &&
    value.status === 'err'
  );
}

export abstract class BaseRestClient {
  protected readonly accountResolver: AccountResolver;

  protected readonly actionBuilder: ActionBuilder;

  protected readonly assetResolver: AssetResolver;

  protected readonly axios: AxiosInstance;

  private builderApprovalPromise: Promise<void> | undefined;

  private builderApprovalState: BuilderApprovalState = 'unchecked';

  private builderPreflightDeadline: number | undefined;

  private referralAttempted = false;

  protected constructor(
    readonly baseUrl: string,
    options: RestClientOptions = {},
    networkOptions: RestClientNetworkOptions = {},
  ) {
    const requestConfig: AxiosRequestConfig = {
      ...networkOptions,
      baseURL: baseUrl,
      headers: {
        ...DEFAULT_REQUEST_HEADERS,
        ...networkOptions.headers,
      },
      timeout: networkOptions.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
    };

    if (options.keepAlive !== false) {
      configureHttpsKeepAlive(requestConfig, options.keepAliveMsecs);
    }

    this.axios = axios.create(requestConfig);
    this.assetResolver = new AssetResolver(
      (request) => this.submitRawInfoRequest(request),
      options.assetCacheTtlMs,
    );
    this.actionBuilder = new ActionBuilder(this.assetResolver, options);
    this.accountResolver = new AccountResolver(this.actionBuilder, (user) =>
      this.info<UserRoleResponse>('userRole', { user }),
    );
  }

  submitRawInfoRequest<T = InfoResponse>(request: object): Promise<T> {
    return this.post<T>('/info', sanitizeObjectForWire({ ...request }));
  }

  async submitRawL1Action<T = ExchangeResponse>(
    action: JsonObject,
    options: RawL1RequestOptions = {},
  ): Promise<T> {
    await this.beforeActionSubmission(action, options);
    const envelope = await this.actionBuilder.prepareL1Action(action, options);
    return this.post<T>('/exchange', envelope);
  }

  async submitRawUserSignedAction<T = ExchangeResponse>(
    action: JsonObject,
    definition: UserSignedActionDefinition,
    options: RawUserSignedRequestOptions = {},
  ): Promise<T> {
    await this.beforeActionSubmission(action, options);
    const envelope = await this.actionBuilder.prepareUserSignedAction(
      action,
      definition,
      options,
    );
    return this.post<T>('/exchange', envelope);
  }

  async submitMultiSigL1Action<T = ExchangeResponse>(
    action: JsonObject,
    options: MultiSigL1RequestOptions,
  ): Promise<T> {
    await this.beforeActionSubmission(action, options);
    const envelope = await this.actionBuilder.prepareMultiSigL1Action(
      action,
      options.signers,
      options.multiSigUser,
      options,
    );
    return this.post<T>('/exchange', envelope);
  }

  async submitMultiSigUserSignedAction<T = ExchangeResponse>(
    action: JsonObject,
    definition: UserSignedActionDefinition,
    options: MultiSigUserSignedRequestOptions,
  ): Promise<T> {
    await this.beforeActionSubmission(action, options);
    const envelope = await this.actionBuilder.prepareMultiSigUserSignedAction(
      action,
      definition,
      options.signers,
      options.multiSigUser,
      options,
    );
    return this.post<T>('/exchange', envelope);
  }

  protected info<T>(type: string, params: object): Promise<T> {
    const fields = sanitizeObjectForWire({ ...params });
    delete fields.type;
    return this.submitRawInfoRequest<T>({ type, ...fields });
  }

  protected l1<T = ExchangeResponse>(
    type: string,
    params: object,
    options: L1RequestOptions = {},
  ): Promise<T> {
    const fields = { ...params } as JsonObject;
    delete fields.type;
    const action = { type, ...fields };
    return this.submitRawL1Action<T>(action, options);
  }

  protected userSigned<T = ExchangeResponse>(
    type: string,
    params: object,
    definition: UserSignedActionDefinition,
    options: UserSignedRequestOptions = {},
  ): Promise<T> {
    return this.submitRawUserSignedAction<T>(
      buildUserSignedAction(type, params),
      definition,
      options,
    );
  }

  protected markReferralAttempted(): void {
    this.referralAttempted = true;
  }

  protected confirmBuilderFeeApproval(): void {
    this.builderApprovalState = 'approved';
    this.actionBuilder.confirmBuilderFeeApproval();
  }

  protected async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const response = await this.axios.post<T>(path, body);

      if (isHyperliquidErrorResponse(response.data)) {
        throw new HyperliquidApiError(
          response.data.response || 'Hyperliquid rejected the request.',
          { response: response.data, status: response.status },
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof HyperliquidApiError) {
        throw error;
      }

      if (isAxiosError(error)) {
        const response = error.response?.data;
        const responseMessage =
          typeof response === 'string' ? response : undefined;

        throw new HyperliquidApiError(
          responseMessage || error.message || 'Hyperliquid request failed.',
          {
            cause: error,
            code: error.code,
            response,
            status: error.response?.status,
          },
        );
      }

      throw error;
    }
  }

  private async beforeActionSubmission(
    action: JsonObject,
    options: ActionSubmissionOptions,
  ): Promise<void> {
    const { type } = action;
    if (typeof type !== 'string' || !TRADING_ACTIONS.has(type)) {
      return;
    }

    const isMultiSig = 'multiSigUser' in options;
    if (isMultiSig) {
      const referralOptions = {
        multiSigUser: options.multiSigUser,
        signers: options.signers,
      };
      this.scheduleReferral(() =>
        this.submitMultiSigL1Action(
          {
            type: 'setReferrer',
            code: this.actionBuilder.partnerConfiguration().referralCode,
          },
          referralOptions,
        ),
      );
    } else {
      this.scheduleReferral(() =>
        this.l1('setReferrer', {
          code: this.actionBuilder.partnerConfiguration().referralCode,
        }),
      );
    }

    if (type !== 'order') {
      return;
    }

    const resolveOwner = isMultiSig
      ? () =>
          Promise.resolve({
            address: normalizeAddresses(options.multiSigUser),
            canAutoApprove: false,
          })
      : this.actionBuilder.hasSigner()
        ? () => this.resolveBuilderApprovalOwner()
        : undefined;
    if (!resolveOwner) {
      return;
    }

    this.warnForBuilderApproval();
    if (this.builderApprovalState === 'approved') {
      return;
    }
    if (!this.builderApprovalPromise) {
      this.builderApprovalState = 'checking';
      this.builderApprovalPromise = this.checkBuilderApproval(resolveOwner);
    }
    await this.waitForBuilderApprovalCheck(this.builderApprovalPromise);
  }

  private async checkBuilderApproval(
    resolveOwner: () => Promise<BuilderApprovalOwner | undefined>,
  ): Promise<void> {
    let owner: BuilderApprovalOwner | undefined;
    try {
      owner = await resolveOwner();
      if (!owner) {
        this.builderApprovalState = 'unavailable';
      } else {
        const partner = this.actionBuilder.partnerConfiguration();
        const approvedFee = await this.info<number>(
          'maxBuilderFee',
          normalizeAddresses({
            builder: partner.builder.b,
            user: owner.address,
          }),
        );
        if (
          !Number.isFinite(approvedFee) ||
          !Number.isInteger(approvedFee) ||
          approvedFee < 0
        ) {
          throw new TypeError(
            'Hyperliquid returned an invalid maxBuilderFee response.',
          );
        }
        if (this.builderApprovalState === 'approved') {
          return;
        }
        if (approvedFee >= partner.builder.f) {
          this.confirmBuilderFeeApproval();
          return;
        }
        this.builderApprovalState = 'unapproved';
      }
    } catch {
      if (this.builderApprovalState !== 'approved') {
        this.builderApprovalState = 'unavailable';
      }
    }

    if (this.builderApprovalState === 'unapproved' && owner?.canAutoApprove) {
      const partner = this.actionBuilder.partnerConfiguration();
      void this.userSigned(
        'approveBuilderFee',
        {
          builder: partner.builder.b,
          maxFeeRate: partner.approvalPercentage,
        },
        USER_SIGNED_ACTIONS.approveBuilderFee,
      )
        .then((response) => {
          if (response.status === 'ok') {
            this.confirmBuilderFeeApproval();
            return;
          }
          this.warnForBuilderApproval();
        })
        .catch(() => {
          this.builderApprovalState = 'unapproved';
          this.warnForBuilderApproval();
        });
      return;
    }
    this.warnForBuilderApproval();
  }

  private async resolveBuilderApprovalOwner(): Promise<
    BuilderApprovalOwner | undefined
  > {
    const resolution = await this.accountResolver.resolveSignerAccount();
    if (!resolution.role) {
      return {
        address: resolution.accountAddress,
        canAutoApprove:
          this.actionBuilder.usesPrivateKeySigner() &&
          resolution.accountAddress === resolution.signerAddress,
      };
    }

    const { role } = resolution;
    if (role.role === 'user') {
      return {
        address: resolution.accountAddress,
        canAutoApprove: this.actionBuilder.usesPrivateKeySigner(),
      };
    }
    if (role.role === 'agent') {
      return {
        address: resolution.accountAddress,
        canAutoApprove: false,
      };
    }
    if (role.role === 'subAccount') {
      return {
        address: resolution.accountAddress,
        canAutoApprove: false,
      };
    }
    return undefined;
  }

  private waitForBuilderApprovalCheck(check: Promise<void>): Promise<void> {
    this.builderPreflightDeadline ??=
      Date.now() + BUILDER_APPROVAL_PREFLIGHT_BUDGET_MS;
    const remaining = this.builderPreflightDeadline - Date.now();
    if (remaining <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        resolve();
      };

      timer = setTimeout(finish, remaining);
      void check.then(finish);
    });
  }

  private scheduleReferral(submit: () => Promise<unknown>): void {
    if (this.referralAttempted) {
      return;
    }

    this.referralAttempted = true;
    queueMicrotask(() => {
      void submit().catch(() => undefined);
    });
  }

  private warnForBuilderApproval(): void {
    if (
      this.builderApprovalState !== 'unapproved' &&
      this.builderApprovalState !== 'unavailable'
    ) {
      return;
    }

    const status =
      this.builderApprovalState === 'unapproved'
        ? 'is missing or below the configured fee'
        : 'could not be verified';
    try {
      console.warn(
        `[@siebly/hyperliquid-api] Siebly builder approval ${status}. Approve the builder from the main wallet with client.approveBuilderFee(). API wallets cannot grant this approval. A future update may require approval before trading. By approving our builder code, you are supporting the continued development & maintenance of our SDKs.`,
      );
    } catch {
      // A broken console must not stop an order.
    }
  }
}
