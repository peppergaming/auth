/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any */

import { Provider, Web3Provider } from '@ethersproject/providers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { CONNECTED_EVENT_DATA } from '@web3auth/base';
import { Web3AuthCore } from '@web3auth/core';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { ethers } from 'ethers';

import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  AUTH_METHODS,
  CHAIN_NAMESPACES,
  CHAIN_TYPE,
  ChainConfig,
  DEFAULT_EVM_RPC,
  DEFAULT_SOLANA_RPC,
  IS_DEV,
  LOGIN_PROVIDER,
  LOGIN_PROVIDER_TYPE,
  LOGIN_STATUS,
  LOGIN_STATUS_TYPE,
  OPENLOGIN_STORE_KEY,
  PEPPER_ACCESS_TOKEN_KEY,
  PEPPER_CACHED_WALLET_KEY,
  PEPPER_METAMASK,
  PEPPER_WALLETCONNECT,
  PERSONAL_SIGN_PREFIX,
  WALLET_CONNECT_KEY,
  WEB3AUTH_CACHED_ADAPTER_KEY,
  WEB3AUTH_CLIENT_ID,
  WEB3AUTH_CLIENT_ID_DEV,
} from '../config/constants';
import logger, {
  DEFAULT_LEVEL,
  LogLevel,
  setLoggerLevel,
} from '../config/logger';
import { PepperApi } from '../pepperApi';
import { generateNickname, isElectron } from '../utils';
import {
  deepHydrationAvailable,
  initializeSharedStorage,
} from '../utils/storage';
import { Storage } from '../utils/storage/utils';
import {
  ExternalEvmWallet,
  InternalEvmWallet,
  InternalSolanaWallet,
  PepperWallet,
} from '../wallet';

import {
  MetaMaskAdapter,
  openLoginAdapterBuilder,
  UX_MODE_TYPE,
  WalletConnectAdapter,
} from './adapters';

export type { ChainConfig };
const web3authClientId = IS_DEV ? WEB3AUTH_CLIENT_ID_DEV : WEB3AUTH_CLIENT_ID;
const defaultEvmChainId = IS_DEV ? '0x5' : '0x1';
const defaultSolanaChainId = IS_DEV ? '0x2' : '0x1';

/**
 * Example of usage
 *
 * ```ts
 *    const eventSubscriber: EventSubscriber = {

 *       async onConnecting() {
 *          // put here your logic during connection
 *          console.log("Connecting");
 *       },
 *       async onAuthChallengeSigning() {
 *          // put here your logic during signing challenge
 *          console.log("Signing Challenge");
 *       },
 *       async onConnected(userInfo: UserInfo, provider: Provider, signer: PepperWallet) {
 *          // put here your logic for post connection
 *          console.log("Connected");
 *       },
 *       async onDisconnected() {
 *          // put here your logic for post disconnection
 *          console.log("Disconnected");
 *       },
 *       async onErrored(error: any) {
 *       // put here your logic for handling errors
 *          console.log("Connection error");
 *       },
 *     };
 * ```
 */

export interface EventSubscriber {
  /**
   * A function that is called when the sdk is connecting.
   */
  onConnecting?: () => Promise<void>;

  /**
   * A function that is called when the sdk is performing the signing challenge.
   */
  onAuthChallengeSigning?: () => Promise<void>;

  /**
   * A function that is called when the sdk is connected.
   */
  onConnected?: (
    userInfo: UserInfo,
    provider: Provider,
    signer: PepperWallet,
    pepperAccessToken?: string | null
  ) => Promise<void>;

  /**
   * A function that is called when deepHydration is completed.
   */
  onDeepHydrationCompleted?: (success: boolean) => Promise<void>;

  /**
   * A function that is called when the WalletConnect Modal is closed.
   */
  onWalletConnectModalClosed?: () => Promise<void>;

  /**
   * A function that is called when the sdk is disconnected.
   */
  onDisconnected?: () => Promise<void>;

  /**
   * A function that is called when the sdk has connection issues.
   */
  onErrored?: (error: any) => Promise<void>;
}

//  TODO document this
export interface PepperLoginOptions {
  chainConfig?: ChainConfig;
  chainType?: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE];
  clientId?: string;
  logLevel?: LogLevel;
  isMobile?: boolean;
  isDevelopment?: boolean;
  remoteAuthentication?: boolean;
  eventSubscriber?: EventSubscriber;
  deepHydration?: boolean;
  deepHydrationTimeout?: number;
}

export interface UserInfo {
  publicAddress?: string | null;
  publicKey?: string | null;
  email?: string;
  name?: string;
  profileImage?: string;
  typeOfLogin?: LOGIN_PROVIDER_TYPE;
}

interface Web3Info {
  aggregateVerifier?: string;
  verifier?: string;
  verifierId?: string;
  dappShare?: string;
  idToken?: string;
}

interface InitInfo {
  initialized: boolean;
  willDeepHydrate: boolean;
}

const defaultEventSubscriber: EventSubscriber = {
  onConnecting: async () => {},
  onAuthChallengeSigning: async () => {},
  onConnected: async () => {},
  onDeepHydrationCompleted: async () => {},
  onWalletConnectModalClosed: async () => {},
  onDisconnected: async () => {},
  onErrored: async () => {},
};

const defaultEvmChainConfig: ChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainType: CHAIN_TYPE.EVM,
  chainId: defaultEvmChainId,
  name: 'defaultEvm',
  rpcTarget: DEFAULT_EVM_RPC,
};

const defaultSolanaChainConfig: ChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainType: CHAIN_TYPE.SOLANA,
  chainId: defaultSolanaChainId,
  name: 'defaultSolana',
  rpcTarget: DEFAULT_SOLANA_RPC,
};

const defaultPepperLoginOptions: PepperLoginOptions = {
  chainConfig: defaultEvmChainConfig,
  chainType: CHAIN_NAMESPACES.SOLANA,
  clientId: undefined,
  logLevel: DEFAULT_LEVEL,
  isMobile: false,
  isDevelopment: false,
  remoteAuthentication: false,
  deepHydration: false,
  deepHydrationTimeout: 5000,
};

const defaultUserInfo: UserInfo = {
  publicAddress: null,
  publicKey: null,
  email: undefined,
  name: '',
  profileImage: undefined,
  typeOfLogin: '',
};

/**
 * Example of usage
 *
 * ```ts
 *
 * import {PepperLogin} from "@peppergaming/auth"
 *
 * // ...
 * const loginSDK = new PepperLogin();
 *
 * await loginSDK.init()
 *
 * // This will trigger the login flow
 * const web3Provider = await loginSDK.connectTo("google")
 * ```
 */
export class PepperLogin {
  readonly options: PepperLoginOptions;

  readonly chainType: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE] =
    CHAIN_TYPE.EVM;

  private web3Auth: Web3AuthCore | any;
  private loginToken?: string;

  private _userInfo: UserInfo = defaultUserInfo;
  private _web3Info: Web3Info = {};
  private initialized = false;

  private openloginAdapter: OpenloginAdapter | null;
  private metamaskAdapter?: MetaMaskAdapter;
  private walletConnectAdapter?: WalletConnectAdapter;
  private storage: Storage | null = null;
  private pepperApi: PepperApi;
  private subscriber?: EventSubscriber = defaultEventSubscriber;
  private currentStatus: LOGIN_STATUS_TYPE = LOGIN_STATUS.NOT_READY;
  private connectionIssued = false;
  private _deepHydrationTimedOut = false;
  #provider: Provider | null = null;
  #signer: PepperWallet | null = null;

  constructor(options?: Partial<PepperLoginOptions>) {
    this.deepHydration = this.deepHydration.bind(this);

    this.options = defaultPepperLoginOptions;
    if (options) {
      const chainType = options.chainType;
      if (chainType && chainType == CHAIN_NAMESPACES.SOLANA) {
        this.options.chainConfig = defaultSolanaChainConfig;
      }
      this.options = { ...this.options, ...options };
    }
    this.chainType = this.options.chainType;
    const willDeepHydrate =
      !!this.options.deepHydration && deepHydrationAvailable();
    this.storage = initializeSharedStorage(
      this.deepHydration,
      !willDeepHydrate
    );
    setLoggerLevel(this.options.logLevel || DEFAULT_LEVEL);

    if (options && options.eventSubscriber) {
      this.options.eventSubscriber = {
        ...defaultEventSubscriber,
        ...options.eventSubscriber,
      };
    }
    this.subscriber = this.options.eventSubscriber || defaultEventSubscriber;

    if (options && options.chainConfig) {
      this.options.chainConfig = {
        ...defaultEvmChainConfig,
        ...options.chainConfig,
      };
    }
    this.web3Auth = new Web3AuthCore({
      clientId: web3authClientId,
      // @ts-ignore
      chainConfig: this.options.chainConfig,
    });

    this._deepHydrationTimedOut = !this.options.deepHydration;
    this.initialized = false;

    this.externalWalletConnection = this.externalWalletConnection.bind(this);
    this.onWalletConnectConnection = this.onWalletConnectConnection.bind(this);
    logger.info('Created pepper login instance');
  }

  private async deepHydration() {
    if (
      !this.options.deepHydration ||
      [
        LOGIN_STATUS.PEPPER_CONNECTED,
        LOGIN_STATUS.CONNECTED,
        LOGIN_STATUS.CONNECTING,
      ].some((s) => s.includes(this.currentStatus))
    ) {
      await this.subscriber?.onDeepHydrationCompleted(true);
      return;
    }

    if (this._deepHydrationTimedOut) {
      await this.subscriber?.onDeepHydrationCompleted(false);
      return;
    }

    logger.debug('Deep hydration');
    this.currentStatus = LOGIN_STATUS.DEEP_HYDRATING;

    const openLoginStorageCallback = async (error: any, data: any) => {
      if (this._deepHydrationTimedOut) {
        return;
      }
      if (error) {
        logger.error(error);
      }
      if (data) {
        this.storage.set(OPENLOGIN_STORE_KEY, data);
      }
    };

    this.storage.get(OPENLOGIN_STORE_KEY, openLoginStorageCallback);
    const accessTokenStorageCallback = (error: any, data: any) => {
      if (this._deepHydrationTimedOut) {
        return;
      }
      if (error) {
        logger.error(error);
      }
      if (data) {
        this.pepperApi = new PepperApi({
          accessToken: data,
          isDevelopment: this.options.isDevelopment,
        });
      }
    };

    this.storage.get(PEPPER_ACCESS_TOKEN_KEY, accessTokenStorageCallback);

    const web3AuthAdapterStorageCallback = (error: any, data: any) => {
      if (this._deepHydrationTimedOut) {
        return;
      }
      if (error) {
        logger.error(error);
      }
      if (data) {
        setTimeout(async () => {
          const web3authCached = this.storage.get(OPENLOGIN_STORE_KEY);
          const accessToken = this.storage.get(
            PEPPER_ACCESS_TOKEN_KEY,
            accessTokenStorageCallback
          );

          if (web3authCached && accessToken) {
            logger.debug('Deep hydration successful');
            await this.init(true);
            await this.subscriber?.onDeepHydrationCompleted(true);
          }
        }, 1000);
      }
    };

    this.storage.get(
      WEB3AUTH_CACHED_ADAPTER_KEY,
      web3AuthAdapterStorageCallback
    );
  }

  public async init(forceHydration = false): Promise<InitInfo> {
    logger.debug('Initializing  local PepperLogin');
    const willDeepHydrate =
      !!this.options.deepHydration && deepHydrationAvailable();

    setTimeout(async () => {
      this._deepHydrationTimedOut = true;
      if (this.currentStatus === LOGIN_STATUS.DEEP_HYDRATING) {
        this.currentStatus = LOGIN_STATUS.READY;
      }
      const successStatus = [
        LOGIN_STATUS.CONNECTING,
        LOGIN_STATUS.CONNECTED,
        LOGIN_STATUS.PEPPER_CONNECTED,
        LOGIN_STATUS.HYDRATING,
        LOGIN_STATUS.PEPPER_VERIFY,
        LOGIN_STATUS.PEPPER_INIT,
      ].some((s) => s === this.currentStatus);
      await this.subscriber?.onDeepHydrationCompleted(successStatus);
    }, this.options.deepHydrationTimeout);

    if (isElectron()) {
      this.initialized = true;
      return { initialized: this.initialized, willDeepHydrate };
    }

    const pepperAccessToken = this.storage.get(PEPPER_ACCESS_TOKEN_KEY);

    this.pepperApi = new PepperApi({
      accessToken: pepperAccessToken,
      isDevelopment: this.options.isDevelopment,
    });

    const uxMode: UX_MODE_TYPE = this.options.isMobile ? 'redirect' : 'popup';

    try {
      if (forceHydration) {
        this.web3Auth = new Web3AuthCore({
          clientId: web3authClientId,
          // @ts-ignore
          chainConfig: this.options.chainConfig,
        });
      }
      if (forceHydration || !this.openloginAdapter) {
        this.openloginAdapter = await openLoginAdapterBuilder(
          uxMode,
          web3authClientId,
          this.options.chainConfig
        );
        this.web3Auth.configureAdapter(this.openloginAdapter);
      }

      if (this.web3Auth.status !== ADAPTER_STATUS.READY) {
        this.subscribeToAdapterEvents();
        await this.web3Auth.init();
      }

      this.loginToken = undefined;

      let walletConnectSettings: any = this.storage.get(WALLET_CONNECT_KEY);

      if (walletConnectSettings) {
        walletConnectSettings = JSON.parse(walletConnectSettings);
      } else {
        walletConnectSettings = {
          connected: false,
          bridge: 'https://bridge.walletconnect.org',
        };
      }

      this.walletConnectAdapter = new WalletConnectAdapter(
        walletConnectSettings
      );

      this.metamaskAdapter = new MetaMaskAdapter();

      const cachedWallet = this.storage.get(PEPPER_CACHED_WALLET_KEY);

      if (cachedWallet && cachedWallet === PEPPER_METAMASK) {
        await this.connectToMetaMask();
      } else if (cachedWallet && cachedWallet === PEPPER_WALLETCONNECT) {
        if (walletConnectSettings.connected) {
          await this.connectToWalletConnect();
        }
      }

      this.initialized = true;
      this.currentStatus = LOGIN_STATUS.READY;

      logger.info('Initialized Pepper Login');
      // logger.debug('Current web3Auth: ', this.web3Auth);
      // logger.debug('Current user info: ', this._userInfo);
    } catch (e) {
      logger.error('Error while initializing PepperLogin: ', e);
    }
    return { initialized: this.initialized, willDeepHydrate };
  }

  get userInfo(): Partial<UserInfo> | null {
    return this._userInfo;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get signer(): PepperWallet {
    return this.#signer;
  }

  get provider(): Provider {
    return this.#provider;
  }

  get status() {
    return this.currentStatus;
  }

  get pepperAccessToken() {
    return this.storage.get(PEPPER_ACCESS_TOKEN_KEY);
  }

  set eventSubscriber(eventSubscriber: EventSubscriber) {
    this.subscriber = eventSubscriber;
  }

  private subscribeToAdapterEvents() {
    const web3Auth = this.web3Auth;
    web3Auth.on(ADAPTER_EVENTS.CONNECTING, async () => {
      this.currentStatus = LOGIN_STATUS.CONNECTING;
      await this.subscriber?.onConnecting();
      logger.debug('Connecting');
    });

    web3Auth.on(
      ADAPTER_EVENTS.CONNECTED,
      async (data: CONNECTED_EVENT_DATA) => {
        this.currentStatus = LOGIN_STATUS.CONNECTED;
        if (!this.connectionIssued) {
          await this.hydrateSession();
        }
        this.storage.set(
          WEB3AUTH_CACHED_ADAPTER_KEY,
          'openlogin',
          (_: any, data: any) => {
            if (data) {
              logger.debug('Web3Auth cached adapter dispatched');
            }
          }
        );
        logger.info('Connected');
        logger.debug('Connected with data: ', data);
      }
    );

    web3Auth.on(ADAPTER_EVENTS.DISCONNECTED, async () => {
      this.currentStatus = LOGIN_STATUS.READY;
      await this.subscriber?.onDisconnected();

      logger.debug('Disconnected');
    });

    web3Auth.on(ADAPTER_EVENTS.ERRORED, async (error) => {
      this.currentStatus = LOGIN_STATUS.READY;
      await this.subscriber?.onErrored(error);

      logger.error(error);
    });
  }

  public async connectTo(
    loginProvider: LOGIN_PROVIDER_TYPE,
    loginHint?: string,
    loginToken?: string
  ): Promise<Provider | null> {
    if (isElectron()) {
      // TODO implement oauth here
      console.debug('Support for electron not available yet');
      return null;
    }

    if (loginProvider === LOGIN_PROVIDER.METAMASK) {
      return this.connectToMetaMask();
    }

    if (loginProvider === LOGIN_PROVIDER.WALLET_CONNECT) {
      return this.connectToWalletConnect();
    }

    if (
      !this.initialized ||
      !this.openloginAdapter ||
      this.openloginAdapter.status === ADAPTER_STATUS.NOT_READY
    ) {
      logger.error(
        'Pepper Login is not initialized yet! Please call init first.'
      );
      logger.debug('Current web3auth: ', this.web3Auth);
      return null;
    }
    this.connectionIssued = true;

    if (loginToken) {
      this.loginToken = loginToken;
    }

    if (this.web3Auth.status === ADAPTER_STATUS.CONNECTED) {
      logger.warn('Already connected');
      return this.#provider;
    }

    try {
      logger.debug('Trying to connect with: ', loginProvider);
      const loginParams = {
        loginProvider,
        login_hint: loginHint,
      };
      // logger.debug('Login params: ', loginParams);

      const localProvider = await this.web3Auth.connectTo(
        this.openloginAdapter.name,
        loginParams
      );

      if (localProvider) {
        return await this.hydrateSession();
      }
    } catch (e) {
      logger.error('Error while connecting: ', e);
      if (this.web3Auth.loginModal) {
        this.web3Auth.loginModal.closeModal();
      }
      this.currentStatus = LOGIN_STATUS.READY;
      this.openloginAdapter.status = ADAPTER_STATUS.READY;
      this.web3Auth.status = ADAPTER_STATUS.READY;
    }

    this.connectionIssued = false;

    return this.#provider;
  }

  private async externalWalletConnection(name: string, provider: Web3Provider) {
    this.currentStatus = LOGIN_STATUS.CONNECTED;
    this.#provider = provider;
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    this.#signer = new ExternalEvmWallet(signer);
    this.#signer.address = address;
    this._userInfo = {
      ...defaultUserInfo,
      publicAddress: address,
      name: generateNickname(null, address.substring(2, 5)),
      typeOfLogin: 'wallet',
    };
    this._web3Info = {
      verifier: address,
      verifierId: address,
    };
    let pepperAccessToken = this.pepperAccessToken;

    if (pepperAccessToken && !this.loginToken) {
      await this.hydratePepper(pepperAccessToken);
    } else {
      await this.pepperLogin();
    }

    pepperAccessToken = this.pepperAccessToken;
    if (pepperAccessToken) {
      this.storage.set(PEPPER_CACHED_WALLET_KEY, name);
    }
    return this.#provider;
  }

  public async connectToMetaMask() {
    if (isElectron()) {
      // TODO implement oauth here
      console.debug('Support for electron not available yet');
      return null;
    }

    try {
      const provider = await this.metamaskAdapter?.connect(
        this.options.chainConfig
      );
      if (provider) {
        await this.externalWalletConnection(PEPPER_METAMASK, provider);
      }
    } catch (e) {
      logger.error(e);
    }
    return this.#provider;
  }

  private async onWalletConnectConnection(provider?: Web3Provider) {
    // logger.debug('Connecting external wallet with provider: ', provider);
    if (provider) {
      await this.externalWalletConnection(PEPPER_WALLETCONNECT, provider);
    }
  }

  public async connectToWalletConnect() {
    if (isElectron()) {
      // TODO implement oauth here
      logger.debug('Support for electron not available yet');
      return null;
    }

    const onModalClosed = async () => {
      await this.subscriber?.onWalletConnectModalClosed();
    };

    try {
      await this.walletConnectAdapter?.connect(
        this.onWalletConnectConnection,
        onModalClosed,
        this.options.chainConfig
      );
    } catch (e) {
      logger.error(e);
    }
    return this.#provider;
  }

  private async hydratePepper(accessToken: string) {
    this.storage.set(
      PEPPER_ACCESS_TOKEN_KEY,
      accessToken,
      (_: any, data: any) => {
        if (data) {
          logger.debug('Pepper Access Token dispatched');
        }
      }
    );
    this.pepperApi.setAccessToken(accessToken);
    this.currentStatus = LOGIN_STATUS.PEPPER_CONNECTED;
    this.loginToken = null;

    logger.info('Logged with Pepper');
    return accessToken;
  }

  private async hydrateSession() {
    if (
      this.currentStatus === LOGIN_STATUS.HYDRATING ||
      !this.openloginAdapter
    ) {
      return this.#provider;
    }
    this.currentStatus = LOGIN_STATUS.HYDRATING;

    const userInfo = await this.web3Auth.getUserInfo();

    this._userInfo = {
      ...defaultUserInfo,
      email: userInfo.email,
      name: userInfo.name,
      profileImage: userInfo.profileImage,
      typeOfLogin: userInfo.typeOfLogin,
    };

    this._web3Info = {
      aggregateVerifier: userInfo.aggregateVerifier,
      verifier: userInfo.verifier,
      verifierId: userInfo.verifierId,
      dappShare: userInfo.dappShare,
      idToken: userInfo.idToken,
    };

    // logger.debug('Current user info: ', this._userInfo);
    // logger.debug('Web3auth  user info: ', _userInfo);
    if (this.chainType == CHAIN_TYPE.EVM) {
      this.#signer = new InternalEvmWallet(
        this.openloginAdapter,
        this.options.chainConfig || defaultEvmChainConfig
      );
    } else {
      this.#signer = new InternalSolanaWallet(this.openloginAdapter);
    }
    this.#provider = this.#signer.provider || null;

    this._userInfo.publicAddress = this.#signer.address;
    this._userInfo.publicKey = this.#signer.publicKey;
    // logger.debug("Current wallet: ", this.#signer);
    let accessToken = null;
    if (this.options.remoteAuthentication) {
      const pepperAccessToken = this.storage?.get(PEPPER_ACCESS_TOKEN_KEY);
      // logger.debug("pepperAccessToken: ", pepperAccessToken);

      if (pepperAccessToken && !this.loginToken) {
        accessToken = await this.hydratePepper(pepperAccessToken);
      } else {
        accessToken = await this.pepperLogin();
      }
    }

    if (!this.#provider) {
      const chainConfig = this.options.chainConfig;
      this.#provider = new JsonRpcProvider(chainConfig.rpcTarget || '', {
        chainId: parseInt(chainConfig.chainId || '1'),
        name: chainConfig.name || 'default',
      });
    }

    if (this.subscriber) {
      await this.subscriber.onConnected(
        this._userInfo,
        this.#provider,
        this.#signer,
        accessToken
      );
    }

    return this.#provider;
  }

  private async pepperLogin() {
    if (!this.#signer) {
      logger.error('Cannot login with pepper without a #signer');
      return null;
    }
    logger.debug('Logging with Pepper');

    try {
      this.currentStatus = LOGIN_STATUS.PEPPER_INIT;
      const userWeb3Login = {
        address: this._userInfo.publicAddress,
        auth_method: AUTH_METHODS[this._userInfo.typeOfLogin] || '',
        email: this._userInfo.email,
        username: this._userInfo.name,
        web3_identifier: this._web3Info.verifierId || '',
        login_token: this.loginToken || undefined,
      };
      const initResponse = await this.pepperApi.postWeb3Init(userWeb3Login);
      let publicKey = this._userInfo.publicKey;
      await this.subscriber?.onAuthChallengeSigning();
      if (initResponse && initResponse['nonce']) {
        this.currentStatus = LOGIN_STATUS.PEPPER_VERIFY;

        const nonce = initResponse['nonce'];
        const message = PERSONAL_SIGN_PREFIX + nonce;

        const signature = await this.#signer.signMessage(message);
        if (signature && !publicKey) {
          const hash = ethers.utils.hashMessage(nonce);
          publicKey = ethers.utils.recoverPublicKey(hash, signature);
          this.#signer.publicKey = publicKey;
        }

        const userWeb3Verify = {
          public_key: this._userInfo.publicKey || '',
          address: this._userInfo.publicAddress || '',
          // signature: signatureCompact || "",
          signature: signature || '',
          message_prefix: PERSONAL_SIGN_PREFIX,
        };
        const verifyResponse = await this.pepperApi.postWeb3Verify(
          userWeb3Verify
        );

        if (verifyResponse && verifyResponse['access_token']) {
          const accessToken = verifyResponse['access_token'];
          return await this.hydratePepper(accessToken);
        }
      }
    } catch (e) {
      logger.error('Error while logging with pepper: ', e);
      await this.subscriber?.onErrored(e);
      this.currentStatus = LOGIN_STATUS.READY;
    }
    return null;
  }

  public async refreshPepperLogin(loginToken?: string) {
    this.loginToken = loginToken;
    await this.pepperLogin();
    return this.#signer;
  }

  public async logout() {
    logger.warn('Logging out');
    try {
      if (this.web3Auth && this.web3Auth.status === ADAPTER_STATUS.CONNECTED) {
        await this.web3Auth.logout({ cleanup: false });
      }
      if (
        this.openloginAdapter &&
        this.openloginAdapter.status === ADAPTER_STATUS.CONNECTED
      ) {
        await this.openloginAdapter.disconnect();
      }
    } catch (e) {
      logger.error('Error while logging out: ', e);
    }

    this.#provider = null;
    this.#signer = null;

    const callback = () => {};
    this.storage.remove(WEB3AUTH_CACHED_ADAPTER_KEY, callback);
    this.storage.remove(PEPPER_ACCESS_TOKEN_KEY, callback);
    this.storage.remove(PEPPER_CACHED_WALLET_KEY, callback);
    this.storage.remove(WALLET_CONNECT_KEY, callback);

    this.web3Auth.clearCache();
    this.pepperApi.setAccessToken(null);
    this._userInfo = { ...defaultUserInfo };
    this._web3Info = {};
    await this.walletConnectAdapter?.disconnect();
    await this.init();
  }
}
