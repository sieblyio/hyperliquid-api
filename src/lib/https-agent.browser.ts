import type { HttpsRequestOptionsLike } from './https-agent.js';

export const DEFAULT_REQUEST_HEADERS: Readonly<Record<string, string>> = {};

export function configureHttpsKeepAlive(
  requestOptions: HttpsRequestOptionsLike,
  keepAliveMsecs?: number,
): void {
  void requestOptions;
  void keepAliveMsecs;
}
