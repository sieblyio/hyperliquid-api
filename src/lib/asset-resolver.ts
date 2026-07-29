import {
  DEFAULT_ASSET_CACHE_TTL_MS,
  HIP3_ASSET_OFFSET,
  HIP3_DEX_OFFSET,
  OUTCOME_ASSET_OFFSET,
  SPOT_ASSET_OFFSET,
} from '../constants.js';

type InfoSubmitter = (request: Record<string, unknown>) => Promise<unknown>;

interface PerpMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
  }>;
}

interface SpotMeta {
  tokens: Array<{
    index: number;
    name: string;
    szDecimals: number;
  }>;
  universe: Array<{
    index: number;
    name: string;
    tokens: number[];
  }>;
}

type PerpDexEntry = null | string | { name?: string | null };

export interface ResolvedAsset {
  assetId: number;
  canonicalName: string;
  kind: 'hip3' | 'outcome' | 'perp' | 'spot';
  szDecimals?: number;
}

function assertPerpMeta(value: unknown, context: string): PerpMeta {
  if (
    !value ||
    typeof value !== 'object' ||
    !('universe' in value) ||
    !Array.isArray(value.universe)
  ) {
    throw new TypeError(`Invalid ${context} metadata response.`);
  }

  return value as PerpMeta;
}

function assertAllPerpMetas(value: unknown): PerpMeta[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Invalid allPerpMetas response.');
  }

  return value.map((meta, index) =>
    assertPerpMeta(meta, `perpetual DEX ${index}`),
  );
}

function assertSpotMeta(value: unknown): SpotMeta {
  if (
    !value ||
    typeof value !== 'object' ||
    !('tokens' in value) ||
    !Array.isArray(value.tokens) ||
    !('universe' in value) ||
    !Array.isArray(value.universe)
  ) {
    throw new TypeError('Invalid spotMeta response.');
  }

  return value as SpotMeta;
}

function assertPerpDexs(value: unknown): PerpDexEntry[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Invalid perpDexs response.');
  }

  return value as PerpDexEntry[];
}

function dexName(entry: PerpDexEntry): string | undefined {
  if (typeof entry === 'string') {
    return entry || undefined;
  }

  return entry?.name || undefined;
}

export class AssetResolver {
  private aliases = new Map<string, ResolvedAsset>();

  private hasLoaded = false;

  private lastLoadedAt = 0;

  private refreshPromise: Promise<void> | undefined;

  constructor(
    private readonly submitInfo: InfoSubmitter,
    private readonly cacheTtlMs = DEFAULT_ASSET_CACHE_TTL_MS,
    private readonly timestampProvider: () => number = Date.now,
  ) {
    if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) {
      throw new RangeError('assetCacheTtlMs must be a non-negative number.');
    }
  }

  async resolve(identifier: number | string): Promise<ResolvedAsset> {
    if (typeof identifier === 'number') {
      if (!Number.isSafeInteger(identifier) || identifier < 0) {
        throw new RangeError('Asset IDs must be non-negative safe integers.');
      }

      return {
        assetId: identifier,
        canonicalName: String(identifier),
        kind: this.kindFromAssetId(identifier),
      };
    }

    const outcomeMatch = /^#(\d+)$/.exec(identifier);
    if (outcomeMatch) {
      const encoding = Number(outcomeMatch[1]);
      if (!Number.isSafeInteger(encoding)) {
        throw new RangeError(
          `Invalid outcome asset identifier "${identifier}".`,
        );
      }

      return {
        assetId: OUTCOME_ASSET_OFFSET + encoding,
        canonicalName: identifier,
        kind: 'outcome',
      };
    }

    await this.ensureLoaded();
    const resolved =
      this.aliases.get(identifier) ??
      this.aliases.get(identifier.toUpperCase());

    if (!resolved) {
      throw new RangeError(
        `Unknown Hyperliquid asset "${identifier}". Call refreshAssetMetadata() after a new listing.`,
      );
    }

    return resolved;
  }

  async refresh(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.loadMetadata().finally(() => {
      this.refreshPromise = undefined;
    });
    return this.refreshPromise;
  }

  private async ensureLoaded(): Promise<void> {
    const expired =
      !this.hasLoaded ||
      this.timestampProvider() - this.lastLoadedAt >= this.cacheTtlMs;

    if (expired) {
      await this.refresh();
    }
  }

  private async loadMetadata(): Promise<void> {
    const [rawAllPerpMetas, rawSpotMeta, rawPerpDexs] = await Promise.all([
      this.submitInfo({ type: 'allPerpMetas' }),
      this.submitInfo({ type: 'spotMeta' }),
      this.submitInfo({ type: 'perpDexs' }),
    ]);
    const allPerpMetas = assertAllPerpMetas(rawAllPerpMetas);
    const spotMeta = assertSpotMeta(rawSpotMeta);
    const perpDexs = assertPerpDexs(rawPerpDexs);
    const nativePerpMeta = allPerpMetas[0];
    if (!nativePerpMeta) {
      throw new TypeError('allPerpMetas did not contain native perp metadata.');
    }
    const nextAliases = new Map<string, ResolvedAsset>();

    this.addPerpMeta(nextAliases, nativePerpMeta, '', 0, 'perp');
    this.addSpotMeta(nextAliases, spotMeta);

    perpDexs.forEach((entry, dexIndex) => {
      const dex = dexName(entry);
      if (!dex) {
        return;
      }
      const meta = allPerpMetas[dexIndex];
      if (!meta) {
        throw new TypeError(
          `allPerpMetas did not contain metadata for HIP-3 DEX "${dex}".`,
        );
      }
      this.addPerpMeta(
        nextAliases,
        meta,
        dex,
        HIP3_ASSET_OFFSET + dexIndex * HIP3_DEX_OFFSET,
        'hip3',
      );
    });

    this.aliases = nextAliases;
    this.hasLoaded = true;
    this.lastLoadedAt = this.timestampProvider();
  }

  private addPerpMeta(
    aliases: Map<string, ResolvedAsset>,
    meta: PerpMeta,
    dex: string,
    offset: number,
    kind: 'hip3' | 'perp',
  ): void {
    meta.universe.forEach((asset, index) => {
      const canonicalName =
        dex && !asset.name.startsWith(`${dex}:`)
          ? `${dex}:${asset.name}`
          : asset.name;
      const resolved: ResolvedAsset = {
        assetId: offset + index,
        canonicalName,
        kind,
        szDecimals: asset.szDecimals,
      };

      aliases.set(canonicalName, resolved);
      aliases.set(canonicalName.toUpperCase(), resolved);
    });
  }

  private addSpotMeta(
    aliases: Map<string, ResolvedAsset>,
    meta: SpotMeta,
  ): void {
    const tokensByIndex = new Map(
      meta.tokens.map((token) => [token.index, token]),
    );

    meta.universe.forEach((spot) => {
      const baseToken = tokensByIndex.get(spot.tokens[0]);
      const quoteToken = tokensByIndex.get(spot.tokens[1]);
      const pairAlias =
        baseToken && quoteToken
          ? `${baseToken.name}/${quoteToken.name}`
          : undefined;
      const resolved: ResolvedAsset = {
        assetId: SPOT_ASSET_OFFSET + spot.index,
        canonicalName: spot.name,
        kind: 'spot',
        ...(baseToken ? { szDecimals: baseToken.szDecimals } : {}),
      };

      aliases.set(spot.name, resolved);
      aliases.set(spot.name.toUpperCase(), resolved);
      if (pairAlias) {
        aliases.set(pairAlias, resolved);
        aliases.set(pairAlias.toUpperCase(), resolved);
      }
    });
  }

  private kindFromAssetId(
    assetId: number,
  ): 'hip3' | 'outcome' | 'perp' | 'spot' {
    if (assetId >= OUTCOME_ASSET_OFFSET) {
      return 'outcome';
    }
    if (assetId >= HIP3_ASSET_OFFSET) {
      return 'hip3';
    }
    if (assetId >= SPOT_ASSET_OFFSET) {
      return 'spot';
    }
    return 'perp';
  }
}
