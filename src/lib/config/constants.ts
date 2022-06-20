export const WEB3AUTH_CLIENT_ID =
  // cspell:disable-next-line
  'BDxiHUo7CjOaj58Y1Zea9cASZs66-WCb28O5c_D6X246JBkViSwbPaET48DFlBLBiPQ1mVxBRjWmTmFL4PseD2I';
export const isDev = process?.env.NODE_ENV === 'development';

export declare const LOGIN_PROVIDER: {
  readonly GOOGLE: 'google';
  readonly DISCORD: 'discord';
  readonly TWITCH: 'twitch';
  readonly EMAIL_PASSWORDLESS: 'email_passwordless';
};

export type LOGIN_PROVIDER_TYPE =
  typeof LOGIN_PROVIDER[keyof typeof LOGIN_PROVIDER];

// export declare const LOGIN_STATUS: {
//   readonly NOT_READY: 'not_ready';
//   readonly READY: 'ready';
//   readonly CONNECTING: 'connecting';
//   readonly CONNECTED: 'connected';
//   readonly DISCONNECTED: 'disconnected';
//   readonly ERRORED: 'errored';
//   readonly HYDRATING: 'hydrating';
//   readonly PEPPER_INIT: 'pepper_init';
//   readonly PEPPER_VERIFY: 'pepper_verify';
//   readonly PEPPER_CONNECTED: 'pepper_connected';
// };

export const LOGIN_STATUS = {
  NOT_READY: 'not_ready',
  READY: 'ready',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERRORED: 'errored',
  HYDRATING: 'hydrating',
  PEPPER_INIT: 'pepper_init',
  PEPPER_VERIFY: 'pepper_verify',
  PEPPER_CONNECTED: 'pepper_connected',
};

export type LOGIN_STATUS_TYPE = typeof LOGIN_STATUS[keyof typeof LOGIN_STATUS];

export const PEPPER_API_DEV_URL = 'https://dev-nm.e2bs.ch/api';
export const PEPPER_API_PROD_URL = 'https://api-pepper.zone/api';

export const PEPPER_ACCESS_TOKEN_KEY = 'PEPPER_ACCESS_TOKEN';

export const PERSONAL_SIGN_PREFIX =
  'Please sign this message to verify your identity: ';

export const CHAIN_TYPE = {
  EVM: 'evm',
  // TODO
  // SOLANA: "solana",
} as const;

export const AUTH_METHODS = {
  google: 'GOOGLE_AUTH',
  discord: 'DISCORD_AUTH',
  twitch: 'TWITCH_AUTH',
  mail: 'PEPPER_AUTH',
  jwt: 'PEPPER_AUTH',
  wallet: 'WALLET_AUTH',
};
