export const WEB3AUTH_CLIENT_ID_DEV =
  // cspell:disable-next-line
  'BDxiHUo7CjOaj58Y1Zea9cASZs66-WCb28O5c_D6X246JBkViSwbPaET48DFlBLBiPQ1mVxBRjWmTmFL4PseD2I';

export const WEB3AUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_PEPPER_WEB3AUTH_CLIENT_ID ||
  // cspell:disable-next-line
  'BEnDajrw8JgtiTSFPxzHMJrFRnmQuP2wtUYXvksI9h9jQAbSVNUo2JmQIs0aTOsrSu7jLaJu5i4io2UCQS-T_uM';
export const IS_DEV = process?.env.NODE_ENV === 'development';

export const LOGIN_PROVIDER = {
  GOOGLE: 'google',
  DISCORD: 'discord',
  TWITCH: 'twitch',
  EMAIL_PASSWORDLESS: 'email_passwordless',
  METAMASK: 'metamask',
  WALLET_CONNECT: 'walletconnect',
};

export type LOGIN_PROVIDER_TYPE =
  typeof LOGIN_PROVIDER[keyof typeof LOGIN_PROVIDER];

export const LOGIN_STATUS = {
  NOT_READY: 'not_ready',
  READY: 'ready',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERRORED: 'errored',
  DEEP_HYDRATING: 'deep_hydrating',
  HYDRATING: 'hydrating',
  PEPPER_INIT: 'pepper_init',
  PEPPER_VERIFY: 'pepper_verify',
  PEPPER_CONNECTED: 'pepper_connected',
};

export type LOGIN_STATUS_TYPE = typeof LOGIN_STATUS[keyof typeof LOGIN_STATUS];

export const PEPPER_API_DEV_URL = 'https://dev-backend.pepper.zone/api';
export const PEPPER_API_PROD_URL = 'https://api-pepper.zone/api';

export const PEPPER_APP_DEV_URL = 'https://dev-app.pepper.zone';
export const PEPPER_APP_PROD_URL = 'https://app.pepperwallet.xyz';

export const PEPPER_APP_OAUTH_PATH = 'oauth';

export const PEPPER_ACCESS_TOKEN_KEY = 'PEPPER_ACCESS_TOKEN';
export const PEPPER_CACHED_WALLET_KEY = 'PEPPER_CACHED_WALLET_KEY';
export const OPENLOGIN_STORE_KEY = 'openlogin_store';
export const WEB3AUTH_CACHED_ADAPTER_KEY = 'Web3Auth-cachedAdapter';
export const WALLET_CONNECT_KEY = 'walletconnect';
export const PERSONAL_SIGN_PREFIX =
  'Please sign this message to verify your identity: ';
export const PEPPER_METAMASK = 'PEPPER_METAMASK';
export const PEPPER_WALLETCONNECT = 'PEPPER_WALLETCONNECT';

export const PEPPER_INFURA_ID = '1aa50780835e4452bbb20a6b6eff8c1f';

export const CHAIN_TYPE = {
  EVM: 'evm',
  // TODO
  // SOLANA: "solana",
  // OTHER: "other",
};

export const CHAIN_NAMESPACES = {
  EIP155: 'eip155',
  // TODO
  // SOLANA: "solana",
  // OTHER: "other",
};

export const AUTH_METHODS = {
  google: 'GOOGLE_AUTH',
  discord: 'DISCORD_AUTH',
  twitch: 'TWITCH_AUTH',
  mail: 'PEPPER_AUTH',
  jwt: 'PEPPER_AUTH',
  wallet: 'WALLET_AUTH',
};

export const ADAPTER_STATUS = {
  NOT_READY: 'not_ready',
  READY: 'ready',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERRORED: 'errored',
} as const;

export const ADAPTER_EVENTS = {
  ...ADAPTER_STATUS,
  ADAPTER_DATA_UPDATED: 'adapter_data_updated',
} as const;
export type ADAPTER_STATUS_TYPE =
  typeof ADAPTER_STATUS[keyof typeof ADAPTER_STATUS];

export const RPC_MAPS = {
  1: `https://mainnet.infura.io/v3/${PEPPER_INFURA_ID}`,
  4: 'https://rpc.ankr.com/rinkeby',
  10: 'https://rpc.ankr.com/optimism',
  56: 'https://rpc.ankr.com/bsc',
  66: 'https://exchainrpc.okex.org',
  137: 'https://rpc.ankr.com/polygon',
  25: 'https://evm.cronos.org',
  97: 'https://bsctestapi.terminet.io/rpc',
  100: 'https://rpc.ankr.com/gnosis',
  106: 'https://evmexplorer.velas.com/rpc',
  128: 'https://hecoapi.terminet.io/rpc',
  199: 'https://rpc.bittorrentchain.io',
  250: 'https://rpc.ankr.com/fantom',
  26863: 'https://rpc3.oasischain.io',
  42161: 'https://rpc.ankr.com/arbitrum',
  43114: 'https://rpc.ankr.com/avalanche',
  1313161554: 'https://mainnet.aurora.dev',
};

// TODO document this
export interface ChainConfig {
  chainNamespace?: typeof CHAIN_NAMESPACES[keyof typeof CHAIN_NAMESPACES];
  chainType?: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE];
  chainId?: string;
  name?: string;
  rpcTarget?: string;
}
