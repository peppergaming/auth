/* eslint-disable @typescript-eslint/no-explicit-any*/

export declare interface EventSubscriber {
  onConnecting: () => Promise<void>;
  onConnected: (userInfo: any) => Promise<void>;
  onDisconnected: () => Promise<void>;
  onErrored: (error: any) => Promise<void>;
}

export declare interface LOGIN_PROVIDER {
  GOOGLE: 'google';
  DISCORD: 'discord';
  TWITCH: 'twitch';
  EMAIL_PASSWORDLESS: 'email_passwordless';
  METAMASK: 'metamask';
  WALLET_CONNECT: 'walletconnect';
}
