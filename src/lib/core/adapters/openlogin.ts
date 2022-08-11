import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import {
  isDev,
  WEB3AUTH_CLIENT_ID,
  WEB3AUTH_CLIENT_ID_DEV,
} from '../../config/constants';

const web3authClientId = isDev ? WEB3AUTH_CLIENT_ID_DEV : WEB3AUTH_CLIENT_ID;

export const UX_MODE = {
  POPUP: 'popup',
  REDIRECT: 'redirect',
} as const;
export type UX_MODE_TYPE = typeof UX_MODE[keyof typeof UX_MODE];
export const openLoginAdapterBuilder = async (
  uxMode: UX_MODE_TYPE = 'popup',
  clientID = web3authClientId
): Promise<OpenloginAdapter> => {
  const network = isDev ? 'testnet' : 'mainnet';

  return new OpenloginAdapter({
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
