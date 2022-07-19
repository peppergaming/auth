/* eslint-disable @typescript-eslint/no-explicit-any */
import { Web3Provider } from '@ethersproject/providers';
import MetaMaskOnboarding from '@metamask/onboarding';
import { MetaMaskInpageProvider } from '@metamask/providers';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { ethers } from 'ethers';

import { isDev, WEB3AUTH_CLIENT_ID } from '../config/constants';
import logger from '../config/logger';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
export const UX_MODE = {
  POPUP: 'popup',
  REDIRECT: 'redirect',
} as const;

export type UX_MODE_TYPE = typeof UX_MODE[keyof typeof UX_MODE];

export const getOpenLoginAdapter = async (
  uxMode: UX_MODE_TYPE = 'popup'
): Promise<OpenloginAdapter> => {
  const network = isDev ? 'testnet' : 'mainnet';

  return new OpenloginAdapter({
    adapterSettings: {
      network: network,
      clientId: WEB3AUTH_CLIENT_ID,
      uxMode,
    },
    loginSettings: {
      mfaLevel: 'none',
    },
  });
};

export class MetaMaskAdapter {
  private metamaskOnboarding?: MetaMaskOnboarding;
  private pendingRequest?: Promise<any>;
  private _accounts: any[] = [];
  private _status: 'connected' | 'disconnected' = 'disconnected';
  private _error?: any;
  private _listenerActive = false;
  private _provider?: Web3Provider;

  constructor() {
    this.metamaskOnboarding = new MetaMaskOnboarding();
  }

  get accounts() {
    return this._accounts;
  }

  get status() {
    return this._status;
  }

  get error() {
    return this._error;
  }

  private handleAccounts(accounts: any[]) {
    if (accounts) {
      this._accounts = accounts;
    }
  }

  public async connect(): Promise<Web3Provider | undefined> {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (this.pendingRequest) {
        logger.warn('Request already pending.');
        return this.pendingRequest;
      }
      try {
        this.pendingRequest = window.ethereum?.request({
          method: 'eth_requestAccounts',
        });

        const accounts = (await this.pendingRequest) || [];
        this.handleAccounts(accounts);
        if (accounts.length > 0) {
          this._status = 'connected';
        }

        if (!this._listenerActive) {
          window.ethereum?.on('accountsChanged', (newAccounts) => {
            this.handleAccounts(newAccounts as any[]);
          });
          this._listenerActive = true;
        }

        this._provider = new ethers.providers.Web3Provider(
          window.ethereum as any
        );
        this._error = undefined;
        logger.debug('Metamask _accounts: ', this._accounts);
      } catch (e) {
        this._error = e;
        logger.error('Error while getting _accounts: ', e);
        this._status = 'disconnected';
      } finally {
        this.pendingRequest = undefined;
        this.metamaskOnboarding?.stopOnboarding();
      }
    } else {
      this.metamaskOnboarding?.startOnboarding();
    }

    return this._provider;
  }

  public isConnected() {
    return this._status === 'connected' && window.ethereum?.isConnected();
  }

  public disconnect() {
    this._status = 'disconnected';
    this._provider = undefined;
    this._error = undefined;
    if (this._listenerActive) {
      window.ethereum?.removeAllListeners();
    }
  }
}
