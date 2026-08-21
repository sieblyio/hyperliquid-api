import type { UserRoleResponse } from '../types/response/info.types.js';
import type { RequestOptions } from '../types/shared.types.js';
import type { ActionBuilder } from './action-builder.js';
import { normalizeAddresses } from './normalize-addresses.js';

export interface SignerAccountResolution {
  accountAddress: string;
  role?: UserRoleResponse;
  signerAddress: string;
}

type UserRoleLoader = (
  user: string,
  options?: RequestOptions,
) => Promise<UserRoleResponse>;

export class AccountResolver {
  private signerAccountPromise: Promise<SignerAccountResolution> | undefined;

  constructor(
    private readonly actionBuilder: ActionBuilder,
    private readonly loadUserRole: UserRoleLoader,
  ) {}

  async resolveAccountAddress(
    requestedUser?: string,
    options?: RequestOptions,
  ): Promise<string> {
    if (requestedUser !== undefined) {
      return normalizeAddresses(requestedUser);
    }

    const configuredVault = this.actionBuilder.configuredVault();
    if (configuredVault) {
      return configuredVault;
    }

    const configuredAccount = this.actionBuilder.configuredAccount();
    if (configuredAccount) {
      return configuredAccount;
    }

    if (!this.actionBuilder.hasSigner()) {
      throw new TypeError(
        'Provide user, set accountAddress or vaultAddress, or configure privateKey or signer.',
      );
    }

    return (await this.resolveSignerAccount(options)).accountAddress;
  }

  resolveSignerAccount(
    options?: RequestOptions,
  ): Promise<SignerAccountResolution> {
    if (!this.signerAccountPromise) {
      this.signerAccountPromise = this.loadSignerAccount(options).catch(
        (error: unknown) => {
          this.signerAccountPromise = undefined;
          throw error;
        },
      );
    }

    return this.signerAccountPromise;
  }

  private async loadSignerAccount(
    options?: RequestOptions,
  ): Promise<SignerAccountResolution> {
    const signerAddress = await this.actionBuilder.signerAddress();
    const configuredAccount = this.actionBuilder.configuredAccount();
    if (configuredAccount) {
      return { accountAddress: configuredAccount, signerAddress };
    }

    const role = await this.loadUserRole(signerAddress, options);
    if (role.role === 'missing') {
      throw new TypeError(
        'The signer is not a Hyperliquid account on this network. Set accountAddress when using an API wallet.',
      );
    }

    const accountAddress =
      role.role === 'agent'
        ? normalizeAddresses(role.data.user)
        : role.role === 'subAccount'
          ? normalizeAddresses(role.data.master)
          : signerAddress;

    return { accountAddress, role, signerAddress };
  }
}
