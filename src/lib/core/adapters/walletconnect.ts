/* eslint-disable no-empty */

import { Web3Provider } from '@ethersproject/providers';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from '@walletconnect/qrcode-modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

import { PEPPER_INFURA_ID } from '../../config/constants';
import logger from '../../config/logger';

const defaultSettings = {
  bridge: 'https://l.bridge.walletconnect.org', // Required
  // bridge: "https://bridge.walletconnect.org", // Required
  // qrcodeModal: QRCodeModal,
};

export class WalletConnectAdapter {
  private _connector?: WalletConnect;
  // private _settings;
  private _provider?: Web3Provider;

  constructor(settings = defaultSettings) {
    this._connector = new WalletConnect(settings);
    // this._settings = settings;
  }

  get connector() {
    return this._connector;
  }

  private async onConnectionSuccess(
    onConnect: (provider: Web3Provider) => Promise<void>
  ) {
    QRCodeModal.close();
    const wcProvider = new WalletConnectProvider({
      infuraId: PEPPER_INFURA_ID,
      connector: this._connector,
      // chainId: payload.params[0].chainId,
    });
    await wcProvider.enable();
    this._provider = new ethers.providers.Web3Provider(wcProvider);
    await onConnect(this._provider);
  }

  public async connect(onConnect: (provider: Web3Provider) => Promise<void>) {
    this.connector?.on('disconnect', async () => {
      console.warn('WalletConnect Disconnected');
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
          await this.onConnectionSuccess(onConnect);
        }
      }
    );

    if (this.connector && !this.connector.connected) {
      await this.connector.createSession();
      logger.debug('WalletConnect opening modal');

      QRCodeModal.open(this.connector.uri, () => {
        logger.debug('WalletConnect Closed modal');
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
