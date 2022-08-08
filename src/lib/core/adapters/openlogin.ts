import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import { ChainConfig } from '../../../types';
import {
  CHAIN_NAMESPACES,
  isDev,
  WEB3AUTH_CLIENT_ID,
} from '../../config/constants';

export const UX_MODE = {
  POPUP: 'popup',
  REDIRECT: 'redirect',
} as const;
export type UX_MODE_TYPE = typeof UX_MODE[keyof typeof UX_MODE];
export const openLoginAdapterBuilder = async (
  uxMode: UX_MODE_TYPE = 'popup',
  clientID = WEB3AUTH_CLIENT_ID,
  chainConfig?: ChainConfig
): Promise<OpenloginAdapter> => {
  const network = isDev ? 'testnet' : 'mainnet';

  return new OpenloginAdapter({
    chainConfig: {
      chainId: chainConfig?.chainId || '1',
      // @ts-ignore
      chainNamespace: chainConfig.chainNamespace || CHAIN_NAMESPACES.EIP155,
      rpcTarget: chainConfig?.rpcTarget || '',
      displayName: chainConfig?.name || 'default',
    },
    adapterSettings: {
      network: network,
      clientId: clientID,
      uxMode,
    },
    loginSettings: {
      mfaLevel: 'none',
    },
  });
};
