import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getED25519Key } from '@toruslabs/openlogin-ed25519';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import { ChainConfig } from '../config/constants';

import { PepperWallet } from './base';

export class PepperSolanaWallet implements PepperWallet {
  private _publicKey: PublicKey;
  private _provider: any;
  // @ts-ignore
  readonly #secretKey: Uint8Array;

  constructor(privKey: string) {
    const keypair = Keypair.fromSecretKey(Buffer.from(privKey, 'hex'));
    this._publicKey = keypair.publicKey;
    this.#secretKey = keypair.secretKey;

    console.debug(this);
  }

  get publicKey() {
    return this._publicKey.toString();
  }

  get address() {
    return this.publicKey;
  }

  // @ts-ignore
  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    // TODO
    return new Transaction();
  }

  public async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // TODO
    return message;
  }

  get provider() {
    // TODO
    return this._provider;
  }
}

export class InternalSolanaWallet extends PepperSolanaWallet {
  // @ts-ignore
  constructor(adapter: OpenloginAdapter, chainConfig: ChainConfig) {
    if (!adapter.openloginInstance) {
      throw new Error('Adapter must be initialized with a correct private key');
    }
    const hexPrivKey = getED25519Key(
      adapter.openloginInstance.privKey
    ).sk.toString('hex');

    super(hexPrivKey);
  }
}
