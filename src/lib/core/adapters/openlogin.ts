import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import {
  CHAIN_NAMESPACES,
  ChainConfig,
  EVM_DEFAULT_RPC,
  IS_DEV,
  WEB3AUTH_CLIENT_ID,
  WEB3AUTH_CLIENT_ID_DEV,
} from '../../config/constants';

const web3authClientId = IS_DEV ? WEB3AUTH_CLIENT_ID_DEV : WEB3AUTH_CLIENT_ID;

export const UX_MODE = {
  POPUP: 'popup',
  REDIRECT: 'redirect',
} as const;
export type UX_MODE_TYPE = typeof UX_MODE[keyof typeof UX_MODE];
export const openLoginAdapterBuilder = async (
  uxMode: UX_MODE_TYPE = 'popup',
  clientID = web3authClientId,
  chainConfig?: ChainConfig
): Promise<OpenloginAdapter> => {
  const network = IS_DEV ? 'testnet' : 'mainnet';

  const currentChainConfig = {
    chainId: chainConfig?.chainId || '0x1',
    chainNamespace:
      chainConfig?.chainNamespace ||
      chainConfig?.chainType ||
      CHAIN_NAMESPACES.EIP155,
    rpcTarget: chainConfig?.rpcTarget || EVM_DEFAULT_RPC,
    displayName: chainConfig?.name || 'default',
  };

  return new OpenloginAdapter({
    // @ts-ignore
    chainConfig: currentChainConfig,
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
