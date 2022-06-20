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
