import { TransactionRequest } from '@ethersproject/abstract-provider';
import { Bytes } from '@ethersproject/bytes';
import { ProgressCallback } from '@ethersproject/json-wallets';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { Wallet } from 'ethers';

import logger from '../config/logger';

export class PepperWallet {
  readonly #wallet: Wallet;

  constructor(adapter: OpenloginAdapter) {
    if (
      !adapter ||
      !adapter.openloginInstance ||
      !(adapter.openloginInstance.privKey.length > 0)
    ) {
      logger.debug('Pepper wallet received an invalid adapter: ', adapter);
      throw new Error('Unable to instantiate Pepper Wallet');
    }

    this.#wallet = new Wallet(`0x${adapter.openloginInstance.privKey}`);
  }

  get address() {
    return this.#wallet.address;
  }

  get publicKey() {
    return this.#wallet.publicKey;
  }

  get provider() {
    return this.#wallet.provider;
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    return await this.#wallet.signTransaction(transaction);
  }

  async signMessage(message: Bytes | string): Promise<string> {
    return await this.#wallet.signMessage(message);
  }

  async encrypt(
    password: Bytes | string,
    options?: any,
    progressCallback?: ProgressCallback
  ): Promise<string> {
    return await this.#wallet.encrypt(password, options, progressCallback);
  }
}
