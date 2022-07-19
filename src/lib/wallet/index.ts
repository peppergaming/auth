import { TransactionRequest } from '@ethersproject/abstract-provider';
import { Bytes } from '@ethersproject/bytes';
import { JsonRpcSigner } from '@ethersproject/providers';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { Signer, Wallet } from 'ethers';

import logger from '../config/logger';

export abstract class PepperWallet {
  readonly #wallet: Signer;
  private _address: string;
  private _publicKey: string;

  protected constructor(wallet: Signer, address = '', publicKey = '') {
    this.#wallet = wallet;
    this._address = address;
    this._publicKey = publicKey;
  }

  get address() {
    return this._address;
  }

  set address(address) {
    this._address = address;
  }

  get publicKey() {
    return this._publicKey;
  }

  set publicKey(publicKey) {
    this._publicKey = publicKey;
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
}

export class InternalWallet extends PepperWallet {
  constructor(adapter: OpenloginAdapter) {
    if (
      !adapter ||
      !adapter.openloginInstance ||
      !(adapter.openloginInstance.privKey.length > 0)
    ) {
      logger.debug('Pepper wallet received an invalid adapter: ', adapter);
      throw new Error('Unable to instantiate Pepper Wallet');
    }
    const wallet = new Wallet(`0x${adapter.openloginInstance.privKey}`);
    super(wallet, wallet.address, wallet.publicKey);
  }
}

export class ExternalWallet extends PepperWallet {
  constructor(signer: JsonRpcSigner) {
    super(signer);
  }
}
