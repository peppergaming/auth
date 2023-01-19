export interface PepperWallet {
  publicKey?: string;
  address: string;

  prepareSendTransaction: (
    amount: number,
    recipientAddress: string
  ) => Promise<any>;
  prepareSendNftTransaction: (
    tokenAddress: string,
    recipientAddress: string,
    id?: string
  ) => Promise<any>;
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (message: any) => Promise<any>;
  signAndSendTransaction: (tx: any) => Promise<any>;
  provider?: any;

  accounts: () => Promise<any[]>;
  balance: () => Promise<any>;
}
