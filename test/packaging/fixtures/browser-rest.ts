import { type AllMidsResponse, RestClient } from '@siebly/hyperliquid-api';

export type PublicResponseContract = AllMidsResponse;

/** Browser fixture with no request made during import. */
export function createRestClient(): RestClient {
  return new RestClient();
}
