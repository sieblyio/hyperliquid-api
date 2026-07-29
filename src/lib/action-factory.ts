import type { BuilderCode, JsonObject } from '../types/shared.types.js';
import type { AssetResolver } from './asset-resolver.js';
import { decimalToWire } from './decimal.js';
import { normalizeAddresses } from './normalize-addresses.js';
import { sanitizeObjectForWire } from './wire.js';

export type AssetIdentifier = number | string;

export interface LimitOrderType {
  limit: {
    tif: 'Alo' | 'FrontendMarket' | 'Gtc' | 'Ioc';
  };
}

export interface TriggerOrderType {
  trigger: {
    isMarket: boolean;
    tpsl: 'sl' | 'tp';
    triggerPx: string;
  };
}

export type OrderType = LimitOrderType | TriggerOrderType;
export type Grouping = 'na' | 'normalTpsl' | 'positionTpsl' | { p: number };

export interface OrderWireInput {
  a: AssetIdentifier;
  b: boolean;
  c?: string;
  p: string;
  r: boolean;
  s: string;
  t: OrderType;
}

export interface OrderWire {
  a: number;
  b: boolean;
  c?: string;
  p: string;
  r: boolean;
  s: string;
  t: OrderType;
}

export interface ModifyWireInput {
  oid: number | string;
  order: OrderWireInput;
}

export interface CancelWireInput {
  a: AssetIdentifier;
  o: number;
}

export interface CancelByCloidWireInput {
  asset: AssetIdentifier;
  cloid: string;
}

const ACTION_FIELD_ORDER: Readonly<Record<string, readonly string[]>> = {
  CSignerAction: ['type', 'unjailSelf', 'jailSelf'],
  CValidatorAction: ['type', 'register', 'changeProfile', 'unregister'],
  agentEnableDexAbstraction: ['type'],
  agentSendAsset: [
    'type',
    'destination',
    'sourceDex',
    'destinationDex',
    'token',
    'amount',
    'fromSubAccount',
    'nonce',
  ],
  agentSetAbstraction: ['type', 'abstraction'],
  authorizeAqav2Role: ['type', 'token', 'role'],
  batchModify: ['type', 'modifies', 'a'],
  borrowLend: ['type', 'operation', 'token', 'amount'],
  cancel: ['type', 'cancels', 'f'],
  cancelByCloid: ['type', 'cancels', 'f'],
  claimRewards: ['type'],
  createSubAccount: ['type', 'name'],
  createVault: ['type', 'name', 'description', 'initialUsd', 'nonce'],
  evmUserModify: ['type', 'usingBigBlocks'],
  finalizeEvmContract: ['type', 'token', 'input'],
  gossipPriorityBid: ['type', 'slotId', 'ip', 'maxGas'],
  hip3LiquidatorTransfer: ['type', 'dex', 'ntl', 'isDeposit'],
  modify: ['type', 'oid', 'order', 'a'],
  multiSig: ['type', 'signatureChainId', 'signatures', 'payload'],
  noop: ['type'],
  order: ['type', 'orders', 'grouping', 'builder'],
  perpDeploy: ['type'],
  registerReferrer: ['type', 'code'],
  reserveRequestWeight: ['type', 'weight'],
  scheduleCancel: ['type', 'time'],
  setDisplayName: ['type', 'displayName'],
  setReferrer: ['type', 'code'],
  spotDeploy: ['type'],
  spotUser: ['type', 'toggleSpotDusting'],
  subAccountModify: ['type', 'subAccountUser', 'name'],
  subAccountSpotTransfer: [
    'type',
    'subAccountUser',
    'isDeposit',
    'token',
    'amount',
  ],
  subAccountTransfer: ['type', 'subAccountUser', 'isDeposit', 'usd'],
  topUpIsolatedOnlyMargin: ['type', 'asset', 'leverage'],
  twapCancel: ['type', 'a', 't'],
  twapOrder: ['type', 'twap'],
  updateIsolatedMargin: ['type', 'asset', 'isBuy', 'ntli'],
  updateLeverage: ['type', 'asset', 'isCross', 'leverage'],
  userOutcome: [
    'type',
    'splitOutcome',
    'mergeOutcome',
    'mergeQuestion',
    'negateOutcome',
  ],
  validatorL1Stream: ['type', 'riskFreeRate'],
  vaultDistribute: ['type', 'vaultAddress', 'usd'],
  vaultModify: [
    'type',
    'vaultAddress',
    'allowDeposits',
    'alwaysCloseOnWithdraw',
  ],
  vaultTransfer: ['type', 'vaultAddress', 'isDeposit', 'usd'],
};

function isJsonObject(value: unknown): value is JsonObject {
  return !Array.isArray(value) && value !== null && typeof value === 'object';
}

function orderObjectFields(
  value: JsonObject,
  preferredFields: readonly string[],
): JsonObject {
  const ordered: JsonObject = {};
  const preferred = new Set(preferredFields);

  for (const field of preferredFields) {
    if (field in value) {
      ordered[field] = value[field];
    }
  }

  for (const [field, entry] of Object.entries(value)) {
    if (!preferred.has(field)) {
      ordered[field] = entry;
    }
  }

  return ordered;
}

function normalizeOrderType(orderType: OrderType): OrderType {
  if ('limit' in orderType) {
    return {
      limit: {
        tif: orderType.limit.tif,
      },
    };
  }

  return {
    trigger: {
      isMarket: orderType.trigger.isMarket,
      triggerPx: decimalToWire(orderType.trigger.triggerPx),
      tpsl: orderType.trigger.tpsl,
    },
  };
}

function normalizeExistingOrderWire(value: unknown): JsonObject {
  if (!isJsonObject(value)) {
    throw new TypeError('Each order must be an object.');
  }
  if (typeof value.p !== 'string' || typeof value.s !== 'string') {
    throw new TypeError('Order prices and sizes must be decimal strings.');
  }
  if (
    (typeof value.a !== 'number' && typeof value.a !== 'string') ||
    typeof value.b !== 'boolean' ||
    typeof value.r !== 'boolean' ||
    !isJsonObject(value.t)
  ) {
    throw new TypeError(
      'Each order must contain a, b, p, s, r, and t using the documented wire types.',
    );
  }

  const normalized: JsonObject = {
    ...value,
    p: decimalToWire(value.p),
    s: decimalToWire(value.s),
  };
  const orderType = value.t;

  if (isJsonObject(orderType.trigger)) {
    const trigger = orderType.trigger;
    const triggerPx = trigger.triggerPx;
    if (typeof triggerPx !== 'string') {
      throw new TypeError('Trigger prices must be decimal strings.');
    }

    normalized.t = {
      trigger: {
        ...trigger,
        triggerPx: decimalToWire(triggerPx),
      },
    };
  }

  return orderObjectFields(normalized, ['a', 'b', 'p', 's', 'r', 't', 'c']);
}

function orderedNested(
  value: unknown,
  preferredFields: readonly string[],
): unknown {
  return isJsonObject(value)
    ? orderObjectFields(value, preferredFields)
    : value;
}

function normalizeAdvancedNestedFields(type: string, action: JsonObject): void {
  if (type === 'CValidatorAction') {
    action.changeProfile = orderedNested(action.changeProfile, [
      'node_ip',
      'name',
      'description',
      'unjailed',
      'disable_delegations',
      'commission_bps',
      'signer',
    ]);
    if (isJsonObject(action.register)) {
      action.register.profile = orderedNested(action.register.profile, [
        'node_ip',
        'name',
        'description',
        'delegations_disabled',
        'commission_bps',
        'signer',
      ]);
      action.register = orderObjectFields(action.register, [
        'profile',
        'unjailed',
        'initial_wei',
      ]);
    }
  }

  if (type === 'perpDeploy') {
    for (const field of ['registerAsset2', 'registerAsset']) {
      const registration = action[field];
      if (isJsonObject(registration)) {
        registration.assetRequest = orderedNested(
          registration.assetRequest,
          field === 'registerAsset2'
            ? ['coin', 'szDecimals', 'oraclePx', 'marginTableId', 'marginMode']
            : [
                'coin',
                'szDecimals',
                'oraclePx',
                'marginTableId',
                'onlyIsolated',
              ],
        );
        registration.schema = orderedNested(registration.schema, [
          'fullName',
          'collateralToken',
          'oracleUpdater',
        ]);
        action[field] = orderObjectFields(registration, [
          'maxGas',
          'assetRequest',
          'dex',
          'schema',
        ]);
      }
    }

    action.setOracle = orderedNested(action.setOracle, [
      'dex',
      'oraclePxs',
      'markPxs',
      'externalPerpPxs',
    ]);
    if (isJsonObject(action.insertMarginTable)) {
      const marginTable = action.insertMarginTable.marginTable;
      if (isJsonObject(marginTable)) {
        if (Array.isArray(marginTable.marginTiers)) {
          marginTable.marginTiers = marginTable.marginTiers.map((tier) =>
            orderedNested(tier, ['lowerBound', 'maxLeverage']),
          );
        }
        action.insertMarginTable.marginTable = orderObjectFields(marginTable, [
          'description',
          'marginTiers',
        ]);
      }
      action.insertMarginTable = orderObjectFields(action.insertMarginTable, [
        'dex',
        'marginTable',
      ]);
    }
    action.setFeeRecipient = orderedNested(action.setFeeRecipient, [
      'dex',
      'feeRecipient',
    ]);
    if (
      isJsonObject(action.setSubDeployers) &&
      Array.isArray(action.setSubDeployers.subDeployers)
    ) {
      action.setSubDeployers.subDeployers =
        action.setSubDeployers.subDeployers.map((entry) =>
          orderedNested(entry, ['variant', 'user', 'allowed']),
        );
      action.setSubDeployers = orderObjectFields(action.setSubDeployers, [
        'dex',
        'subDeployers',
      ]);
    }
    action.setFeeScale = orderedNested(action.setFeeScale, ['dex', 'scale']);
    action.setPerpAnnotation = orderedNested(action.setPerpAnnotation, [
      'coin',
      'category',
      'description',
      'displayName',
      'keywords',
    ]);
  }

  if (type === 'spotDeploy') {
    if (isJsonObject(action.registerToken2)) {
      action.registerToken2.spec = orderedNested(action.registerToken2.spec, [
        'name',
        'szDecimals',
        'weiDecimals',
      ]);
      action.registerToken2 = orderObjectFields(action.registerToken2, [
        'spec',
        'maxGas',
        'fullName',
      ]);
    }
    action.userGenesis = orderedNested(action.userGenesis, [
      'token',
      'userAndWei',
      'existingTokenAndWei',
      'blacklistUsers',
    ]);
    action.genesis = orderedNested(action.genesis, [
      'token',
      'maxSupply',
      'noHyperliquidity',
    ]);
    action.registerSpot = orderedNested(action.registerSpot, ['tokens']);
    action.registerHyperliquidity = orderedNested(
      action.registerHyperliquidity,
      ['spot', 'startPx', 'orderSz', 'nOrders', 'nSeededLevels'],
    );
    action.setDeployerTradingFeeShare = orderedNested(
      action.setDeployerTradingFeeShare,
      ['token', 'share'],
    );
    action.enableQuoteToken = orderedNested(action.enableQuoteToken, ['token']);
    action.disableQuoteToken = orderedNested(action.disableQuoteToken, [
      'token',
    ]);
    action.requestEvmContract = orderedNested(action.requestEvmContract, [
      'token',
      'address',
      'evmExtraWeiDecimals',
    ]);
  }

  if (type === 'userOutcome') {
    for (const field of [
      'splitOutcome',
      'mergeOutcome',
      'mergeQuestion',
      'negateOutcome',
    ]) {
      const operation = action[field];
      if (isJsonObject(operation)) {
        if (typeof operation.amount === 'string') {
          operation.amount = decimalToWire(operation.amount);
        }
        action[field] = orderObjectFields(
          operation,
          field === 'mergeQuestion'
            ? ['question', 'amount']
            : field === 'negateOutcome'
              ? ['question', 'outcome', 'amount']
              : ['outcome', 'amount'],
        );
      }
    }
  }
}

export class ActionFactory {
  constructor(
    private readonly assetResolver: AssetResolver,
    private readonly getBuilder: () => BuilderCode | undefined,
  ) {}

  async order(
    orders: OrderWireInput[],
    grouping: Grouping = 'na',
  ): Promise<JsonObject> {
    if (!Array.isArray(orders) || orders.length === 0) {
      throw new TypeError('submitOrder requires a non-empty orders array.');
    }
    const builder = this.getBuilder();

    return {
      type: 'order',
      orders: await Promise.all(orders.map((order) => this.orderWire(order))),
      grouping,
      ...(builder ? { builder } : {}),
    };
  }

  async batchModify(
    modifies: ModifyWireInput[],
    alwaysPlace?: true,
  ): Promise<JsonObject> {
    return {
      type: 'batchModify',
      modifies: await Promise.all(
        modifies.map(async (modify) => ({
          oid: modify.oid,
          order: await this.orderWire(modify.order),
        })),
      ),
      ...(alwaysPlace ? { a: true } : {}),
    };
  }

  async modify(
    modify: ModifyWireInput,
    alwaysPlace?: true,
  ): Promise<JsonObject> {
    return {
      type: 'modify',
      oid: modify.oid,
      order: await this.orderWire(modify.order),
      ...(alwaysPlace ? { a: true } : {}),
    };
  }

  async cancel(
    cancels: CancelWireInput[],
    fastCancel?: true,
  ): Promise<JsonObject> {
    return {
      type: 'cancel',
      cancels: await Promise.all(
        cancels.map(async (cancel) => ({
          a: (await this.assetResolver.resolve(cancel.a)).assetId,
          o: cancel.o,
        })),
      ),
      ...(fastCancel ? { f: true } : {}),
    };
  }

  async cancelByCloid(
    cancels: CancelByCloidWireInput[],
    fastCancel?: true,
  ): Promise<JsonObject> {
    return {
      type: 'cancelByCloid',
      cancels: await Promise.all(
        cancels.map(async (cancel) => ({
          asset: (await this.assetResolver.resolve(cancel.asset)).assetId,
          cloid: cancel.cloid,
        })),
      ),
      ...(fastCancel ? { f: true } : {}),
    };
  }

  async canonicalizeRaw(action: JsonObject): Promise<JsonObject> {
    const type = action.type;
    if (typeof type !== 'string') {
      throw new TypeError('Every exchange action must have a string type.');
    }

    const normalized = normalizeAddresses(sanitizeObjectForWire(action));
    if (type === 'order') {
      if (!Array.isArray(normalized.orders)) {
        throw new TypeError('An order action must contain an orders array.');
      }

      normalized.orders = await Promise.all(
        normalized.orders.map(async (order) => {
          const existingOrder = normalizeExistingOrderWire(order);
          const asset = existingOrder.a;
          if (typeof asset !== 'number' && typeof asset !== 'string') {
            throw new TypeError('Each order asset must be a number or string.');
          }

          return {
            ...existingOrder,
            a: (await this.assetResolver.resolve(asset)).assetId,
          };
        }),
      );
      const builder = this.getBuilder();
      if (builder) {
        normalized.builder = builder;
      } else {
        delete normalized.builder;
      }
      normalized.grouping ??= 'na';
    }

    if (type === 'batchModify') {
      if (!Array.isArray(normalized.modifies)) {
        throw new TypeError(
          'A batchModify action must contain a modifies array.',
        );
      }

      normalized.modifies = await Promise.all(
        normalized.modifies.map(async (modify) => {
          if (!isJsonObject(modify)) {
            throw new TypeError('Each modification must be an object.');
          }

          const order = normalizeExistingOrderWire(modify.order);
          const asset = order.a;
          if (typeof asset !== 'number' && typeof asset !== 'string') {
            throw new TypeError(
              'Each modified order asset must be a number or string.',
            );
          }

          return {
            oid: modify.oid,
            order: {
              ...order,
              a: (await this.assetResolver.resolve(asset)).assetId,
            },
          };
        }),
      );
    }

    if (type === 'modify') {
      if (!isJsonObject(normalized.order)) {
        throw new TypeError('A modify action must contain an order object.');
      }

      const order = normalizeExistingOrderWire(normalized.order);
      const asset = order.a;
      if (typeof asset !== 'number' && typeof asset !== 'string') {
        throw new TypeError(
          'A modified order asset must be a number or string.',
        );
      }

      normalized.order = {
        ...order,
        a: (await this.assetResolver.resolve(asset)).assetId,
      };
    }

    if (type === 'cancel') {
      if (!Array.isArray(normalized.cancels)) {
        throw new TypeError('A cancel action must contain a cancels array.');
      }

      normalized.cancels = await Promise.all(
        normalized.cancels.map(async (cancel) => {
          if (
            !isJsonObject(cancel) ||
            (typeof cancel.a !== 'number' && typeof cancel.a !== 'string')
          ) {
            throw new TypeError(
              'Each cancellation must contain a numeric or string asset in a.',
            );
          }

          return {
            a: (await this.assetResolver.resolve(cancel.a)).assetId,
            o: cancel.o,
          };
        }),
      );
    }

    if (type === 'cancelByCloid') {
      if (!Array.isArray(normalized.cancels)) {
        throw new TypeError(
          'A cancelByCloid action must contain a cancels array.',
        );
      }

      normalized.cancels = await Promise.all(
        normalized.cancels.map(async (cancel) => {
          if (
            !isJsonObject(cancel) ||
            (typeof cancel.asset !== 'number' &&
              typeof cancel.asset !== 'string')
          ) {
            throw new TypeError(
              'Each client order ID cancellation must contain a numeric or string asset.',
            );
          }

          return {
            asset: (await this.assetResolver.resolve(cancel.asset)).assetId,
            cloid: cancel.cloid,
          };
        }),
      );
    }

    if (
      type === 'updateLeverage' ||
      type === 'updateIsolatedMargin' ||
      type === 'topUpIsolatedOnlyMargin' ||
      type === 'twapCancel'
    ) {
      const assetField = type === 'twapCancel' ? 'a' : 'asset';
      const asset = normalized[assetField];
      if (typeof asset !== 'number' && typeof asset !== 'string') {
        throw new TypeError(
          `${type} must contain a numeric or string asset in ${assetField}.`,
        );
      }

      normalized[assetField] = (
        await this.assetResolver.resolve(asset)
      ).assetId;
    }

    if (type === 'twapOrder') {
      if (
        !isJsonObject(normalized.twap) ||
        (typeof normalized.twap.a !== 'number' &&
          typeof normalized.twap.a !== 'string') ||
        typeof normalized.twap.s !== 'string'
      ) {
        throw new TypeError(
          'A twapOrder action must contain a string size and a numeric or string asset.',
        );
      }

      normalized.twap = orderObjectFields(
        {
          ...normalized.twap,
          a: (await this.assetResolver.resolve(normalized.twap.a)).assetId,
          s: decimalToWire(normalized.twap.s),
        },
        ['a', 'b', 's', 'r', 'm', 't'],
      );
    }

    normalizeAdvancedNestedFields(type, normalized);

    return orderObjectFields(
      sanitizeObjectForWire(normalized),
      ACTION_FIELD_ORDER[type] ?? ['type'],
    );
  }

  private async orderWire(order: OrderWireInput): Promise<OrderWire> {
    const wire: OrderWire = {
      a: (await this.assetResolver.resolve(order.a)).assetId,
      b: order.b,
      p: decimalToWire(order.p),
      s: decimalToWire(order.s),
      r: order.r,
      t: normalizeOrderType(order.t),
    };

    if (order.c !== undefined) {
      wire.c = order.c;
    }

    return wire;
  }
}
