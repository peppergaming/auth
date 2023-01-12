export interface PepperWallet {
  publicKey?: string;
  address: string;

  signTransaction: (tx: any) => Promise<any>;
  signMessage: (message: any) => Promise<any>;
  provider?: any;
}
