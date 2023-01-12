import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getED25519Key } from '@toruslabs/openlogin-ed25519';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { SolanaWallet } from '@web3auth/solana-provider';

import { PepperWallet } from './base';

export class PepperSolanaWallet implements PepperWallet {
  private _publicKey: PublicKey;
  private _provider?: SolanaWallet;
  // @ts-ignore
  readonly #secretKey: Uint8Array;

  constructor(privKey: string, provider?: any) {
    const keypair = Keypair.fromSecretKey(Buffer.from(privKey, 'hex'));
    this._publicKey = keypair.publicKey;
    this.#secretKey = keypair.secretKey;
    this._provider = provider;
  }

  get publicKey() {
    return this._publicKey.toString();
  }

  get address() {
    return this.publicKey;
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.provider) {
      throw new Error('No solana provider available');
    }
    return this.provider.signTransaction(transaction);
  }

  public async signMessage(message: string | Uint8Array): Promise<Uint8Array> {
    if (!this.provider) {
      throw new Error('No solana provider available');
    }
    if (typeof message === 'string') {
      message = Buffer.from(message, 'utf8');
    }

    return this.provider.signMessage(message);
  }

  get provider() {
    return this._provider;
  }

  public async accounts() {
    if (!this.provider) {
      throw new Error('No solana provider available');
    }
    return this.provider.requestAccounts();
  }
}

export class InternalSolanaWallet extends PepperSolanaWallet {
  constructor(adapter: OpenloginAdapter) {
    if (!adapter.openloginInstance) {
      throw new Error('Adapter must be initialized with a correct private key');
    }
    const hexPrivKey = getED25519Key(
      adapter.openloginInstance.privKey
    ).sk.toString('hex');
    const provider = adapter.provider
      ? new SolanaWallet(adapter.provider)
      : undefined;

    super(hexPrivKey, provider);
  }
}
