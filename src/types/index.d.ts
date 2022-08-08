/* eslint-disable @typescript-eslint/no-explicit-any*/

import { CHAIN_TYPE } from '../lib/config/constants';

export declare interface EventSubscriber {
  onConnecting: () => Promise<void>;
  onConnected: (userInfo: any) => Promise<void>;
  onDisconnected: () => Promise<void>;
  onErrored: (error: any) => Promise<void>;
}

// TODO document this
export interface ChainConfig {
  chainType?: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE];
  chainId?: string;
  name?: string;
  rpcTarget?: string;
}
