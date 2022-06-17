import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import { isDev, WEB3AUTH_CLIENT_ID } from '../config/constants';

export const UX_MODE = {
  POPUP: 'popup',
  REDIRECT: 'redirect',
} as const;

export type UX_MODE_TYPE = typeof UX_MODE[keyof typeof UX_MODE];

export const getOpenLoginAdapter = async (
  uxMode: UX_MODE_TYPE = 'popup'
): Promise<OpenloginAdapter> => {
  const network = isDev ? 'testnet' : 'mainnet';

  return new OpenloginAdapter({
    adapterSettings: {
      network: network,
      clientId: WEB3AUTH_CLIENT_ID,
      uxMode,
    },
    loginSettings: {
      // relogin: true,
      mfaLevel: 'none',
    },
  });
};
