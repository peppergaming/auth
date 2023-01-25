import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { getED25519Key } from '@toruslabs/openlogin-ed25519';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { SolanaWallet } from '@web3auth/solana-provider';

import {
  CHAIN_NAMESPACES,
  CHAIN_TYPE,
  ChainConfig,
  DEFAULT_SOLANA_RPC,
  IS_DEV,
  LAMPORTS_TO_SOLANA,
  SOLANA_TO_LAMPORTS,
} from '../config/constants';

import { PepperWallet } from './base';

const defaultSolanaChainId = IS_DEV ? '0x3' : '0x1';
const defaultSolanaChainConfig: ChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainType: CHAIN_TYPE.SOLANA,
  chainId: defaultSolanaChainId,
  name: 'defaultSolana',
  rpcTarget: DEFAULT_SOLANA_RPC,
};

export class PepperSolanaWallet implements PepperWallet {
  private _publicKey: PublicKey;
  private _provider: any;
  readonly #signer?: SolanaWallet;
  // readonly #secretKey: Uint8Array;

  constructor(
    privKey: string,
    signer?: SolanaWallet,
    chainConfig = defaultSolanaChainConfig
  ) {
    const keypair = Keypair.fromSecretKey(Buffer.from(privKey, 'hex'));
    this._publicKey = keypair.publicKey;
    // this.#secretKey = keypair.secretKey;
    this.#signer = signer;
    this._provider = new Connection(
      chainConfig.rpcTarget || DEFAULT_SOLANA_RPC
    );
  }

  get publicKey() {
    return this._publicKey.toString();
  }

  get address() {
    return this.publicKey;
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.#signer) {
      throw new Error('No solana provider available');
    }
    return await this.#signer.signTransaction(transaction);
  }

  public async signMessage(message: string | Uint8Array): Promise<Uint8Array> {
    if (!this.#signer) {
      throw new Error('No solana provider available');
    }
    if (typeof message === 'string') {
      message = Buffer.from(message, 'utf8');
    }

    return await this.#signer.signMessage(message);
  }

  get provider() {
    return this._provider;
  }

  public async accounts() {
    if (!this.#signer) {
      throw new Error('No solana provider available');
    }
    return (await this.#signer?.requestAccounts()) || [];
  }

  public async balance() {
    const balance = await this.provider.getBalance(new PublicKey(this.address));
    return balance * LAMPORTS_TO_SOLANA;
  }

  public async prepareSendNftTransaction(): // tokenAddress: string,
  // recipientAddress: string,
  // id: string | undefined
  Promise<any> {
    return Promise.resolve(undefined);
  }

  public async prepareSendTransaction(
    amount: number,
    recipientAddress: string
  ): Promise<any> {
    const block = await this.provider.getLatestBlockhash('finalized');

    const fromAddress = new PublicKey(this.address);
    const toAddress = new PublicKey(recipientAddress);
    const TransactionInstruction = SystemProgram.transfer({
      fromPubkey: fromAddress,
      toPubkey: toAddress,
      lamports: amount * SOLANA_TO_LAMPORTS,
    });

    return new Transaction({
      blockhash: block.blockhash,
      lastValidBlockHeight: block.lastValidBlockHeight,
      feePayer: fromAddress,
    }).add(TransactionInstruction);
  }

  public async signAndSendTransaction(
    tx: any
  ): Promise<{ signature: string | null }> {
    const transactionResponse = await this.#signer?.signAndSendTransaction(tx);
    return { signature: transactionResponse?.signature || null };
  }
}

export class InternalSolanaWallet extends PepperSolanaWallet {
  constructor(adapter: OpenloginAdapter, chainConfig: ChainConfig) {
    if (!adapter.openloginInstance) {
      throw new Error('Adapter must be initialized with a correct private key');
    }
    const hexPrivKey = getED25519Key(
      adapter.openloginInstance.privKey
    ).sk.toString('hex');
    const provider = adapter.provider
      ? new SolanaWallet(adapter.provider)
      : undefined;

    super(hexPrivKey, provider, chainConfig);
  }
}
