import { Provider, TransactionRequest } from '@ethersproject/abstract-provider';
import { Bytes } from '@ethersproject/bytes';
import { defineReadOnly } from '@ethersproject/properties';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { Signer, Wallet } from 'ethers';

import { ChainConfig } from '../../types';
import logger from '../config/logger';

export class PepperWallet extends Signer {
  readonly #wallet: Signer;
  private _address: string;
  private _publicKey: string;

  protected constructor(wallet: Signer, address = '', publicKey = '') {
    super();
    this.#wallet = wallet;
    this._address = address;
    this._publicKey = publicKey;
    defineReadOnly(this, 'provider', this.#wallet.provider || null);
  }

  getAddress(): Promise<string> {
    return Promise.resolve(this.address);
  }

  connect(provider: Provider): Signer {
    return this.#wallet.connect(provider);
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

  // get provider() {
  //   return this.#wallet.provider;
  // }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    return await this.#wallet.signTransaction(transaction);
  }

  async signMessage(message: Bytes | string): Promise<string> {
    return await this.#wallet.signMessage(message);
  }
}

export class InternalWallet extends PepperWallet {
  constructor(adapter: OpenloginAdapter, chainConfig: ChainConfig) {
    if (
      !adapter ||
      !adapter.openloginInstance ||
      !(adapter.openloginInstance.privKey.length > 0)
    ) {
      logger.debug('Pepper wallet received an invalid adapter: ', adapter);
      throw new Error('Unable to instantiate Pepper Wallet');
    }

    const provider = new JsonRpcProvider(chainConfig.rpcTarget || '', {
      chainId: parseInt(chainConfig.chainId || '1'),
      name: chainConfig.name || 'default',
    });
    const wallet = new Wallet(
      `0x${adapter.openloginInstance.privKey}`,
      provider
    );
    super(wallet, wallet.address, wallet.publicKey);
  }
}

export class ExternalWallet extends PepperWallet {
  constructor(signer: JsonRpcSigner) {
    super(signer);
  }
}
