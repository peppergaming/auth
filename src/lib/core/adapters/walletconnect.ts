/* eslint-disable no-empty,  @typescript-eslint/no-explicit-any */

import { Web3Provider } from '@ethersproject/providers';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from '@walletconnect/qrcode-modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

import {
  ChainConfig,
  PEPPER_INFURA_ID,
  RPC_MAPS,
} from '../../config/constants';
import logger from '../../config/logger';

const defaultSettings = {
  bridge: 'https://l.bridge.walletconnect.org', // Required
};

export class WalletConnectAdapter {
  private _connector?: WalletConnect;
  // private _settings;
  private _provider?: Web3Provider;
  private _chainId = 1;

  constructor(settings = defaultSettings) {
    this._connector = new WalletConnect(settings);
    // this._settings = settings;
  }

  get connected() {
    return this._connector?.connected || false;
  }

  get connector() {
    return this._connector;
  }

  private async onConnectionSuccess(
    onConnect: (provider: Web3Provider) => Promise<void>,
    chainConfig?: ChainConfig
  ) {
    QRCodeModal.close();
    await this.configureProvider(chainConfig);
    await onConnect(this._provider);
  }

  private async configureProvider(chainConfig?: ChainConfig) {
    const options: any = {
      connector: this._connector,
      rpc: RPC_MAPS,
      chainId: this._chainId,
    };
    if (chainConfig && chainConfig.rpcTarget) {
      options.rpc = chainConfig.rpcTarget;
      options.chainId = chainConfig.chainId || this._chainId;
    } else {
      options.infuraId = PEPPER_INFURA_ID;
    }
    const wcProvider = new WalletConnectProvider(options);
    try {
      await wcProvider.enable();
    } catch (e) {
      logger.error(e);
    }
    this._provider = new ethers.providers.Web3Provider(wcProvider);
  }

  public async connect(
    onConnect: (provider: Web3Provider) => Promise<void>,
    onModalClosed: () => Promise<void>,
    chainConfig?: ChainConfig
  ) {
    this.connector?.on('disconnect', async () => {
      logger.warn('WalletConnect Disconnected');
      this._connector = new WalletConnect(defaultSettings);
      QRCodeModal.close();
    });

    this.connector?.on(
      'connect',
      async (
        error: Error | null,
        payload: { params: { accounts: string[]; chainId: number }[] }
      ) => {
        logger.debug('WalletConnect connected with:  ', payload);
        if (error) {
          logger.error('Error on wallet connect connection: ', error);
        } else {
          this._chainId = payload.params[0].chainId;
          await this.onConnectionSuccess(onConnect, chainConfig);
        }
      }
    );

    if (this.connector && !this.connector.connected) {
      await this.connector.createSession();
      logger.debug('WalletConnect opening modal');

      QRCodeModal.open(this.connector.uri, async () => {
        logger.debug('WalletConnect Closed modal');
        await onModalClosed();
      });
    } else {
      await this.onConnectionSuccess(onConnect);
    }
  }

  public async disconnect() {
    if (this.connector && this.connector.connected) {
      try {
        await this.connector.killSession();
        // await this.connector.rejectSession();
      } catch (e) {}
    }
    if (this._provider) {
      this._provider = undefined;
    }
  }
}
