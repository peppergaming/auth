/* eslint-disable @typescript-eslint/no-explicit-any*/

export declare interface EventSubscriber {
  onConnecting: () => Promise<void>;
  onConnected: (userInfo: any) => Promise<void>;
  onDisconnected: () => Promise<void>;
  onErrored: (error: any) => Promise<void>;
}
