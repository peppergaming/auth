/* eslint-disable @typescript-eslint/no-explicit-any*/

export declare interface EventSubscriber {
  onConnecting: () => Promise<void>;
  onConnected: (userInfo: any) => Promise<void>;
  onDisconnected: () => Promise<void>;
  onErrored: (error: any) => Promise<void>;
}

export declare interface LOGIN_PROVIDER {
  readonly GOOGLE: 'google';
  readonly DISCORD: 'discord';
  readonly TWITCH: 'twitch';
  readonly EMAIL_PASSWORDLESS: 'email_passwordless';
  readonly METAMASK: 'metamask';
  readonly WALLET_CONNECT: 'walletconnect';
}
