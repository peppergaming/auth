/* eslint-disable @typescript-eslint/no-empty-function */

import { Provider, Web3Provider } from '@ethersproject/providers';
import { CUSTOM_LOGIN_PROVIDER_TYPE } from '@toruslabs/openlogin/src/constants';
import { CONNECTED_EVENT_DATA } from '@web3auth/base';
import { Web3AuthCore } from '@web3auth/core';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { ethers } from 'ethers';

import { ChainConfig } from '../../types';
import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  AUTH_METHODS,
  CHAIN_NAMESPACES,
  CHAIN_TYPE,
  LOGIN_PROVIDER,
  LOGIN_PROVIDER_TYPE,
  LOGIN_STATUS,
  LOGIN_STATUS_TYPE,
  PEPPER_ACCESS_TOKEN_KEY,
  PEPPER_CACHED_WALLET_KEY,
  PEPPER_METAMASK,
  PEPPER_WALLETCONNECT,
  PERSONAL_SIGN_PREFIX,
  WALLET_CONNECT_KEY,
  WEB3AUTH_CLIENT_ID,
} from '../config/constants';
import logger, {
  DEFAULT_LEVEL,
  LogLevel,
  setLoggerLevel,
} from '../config/logger';
import { PepperApi } from '../pepperApi';
import { generateNickname, isElectron, useStorage } from '../utils';
import { ExternalWallet, InternalWallet, PepperWallet } from '../wallet';

import {
  MetaMaskAdapter,
  openLoginAdapterBuilder,
  UX_MODE_TYPE,
  WalletConnectAdapter,
} from './adapters';

export { ChainConfig };

/**
 * Example of usage
 *
 * ```ts
 *    const eventSubscriber: EventSubscriber = {

 *       async onConnecting() {
 *          // put here your logic during connection
 *          console.log('Connecting');
 *       },
 *       async onAuthChallengeSigning() {
 *          // put here your logic during signing challenge
 *          console.log('Signing Challenge');
 *       },
 *       async onConnected(userInfo: UserInfo, provider: Provider, signer: PepperWallet) {
 *          // put here your logic for post connection
 *          console.log('Connected');
 *       },
 *       async onDisconnected() {
 *          // put here your logic for post disconnection
 *          console.log('Disconnected');
 *       },
 *       async onErrored(error: any) {
 *       // put here your logic for handling errors
 *          console.log('Connection error');
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
    pepperAccessToken?: string
  ) => Promise<void>;

  /**
   * A function that is called when the sdk is disconnected.
   */
  onDisconnected?: () => Promise<void>;

  /**
   * A function that is called when the sdk has connection issues.
   */
  onErrored?: (error) => Promise<void>;
}

//  TODO document this
export interface PepperLoginOptions {
  chainConfig?: ChainConfig;
  clientId?: string;
  logLevel?: LogLevel;
  isMobile?: boolean;
  isDevelopment?: boolean;
  eventSubscriber?: EventSubscriber;
}

export interface UserInfo {
  publicAddress?: string | null;
  publicKey?: string | null;
  email?: string;
  name?: string;
  profileImage?: string;
  typeOfLogin?: LOGIN_PROVIDER_TYPE | CUSTOM_LOGIN_PROVIDER_TYPE;
}

interface Web3Info {
  aggregateVerifier?: string;
  verifier?: string;
  verifierId?: string;
  dappShare?: string;
  idToken?: string;
}

const defaultEventSubscriber: EventSubscriber = {
  onConnecting: async () => {},
  onAuthChallengeSigning: async () => {},
  onConnected: async () => {},
  onDisconnected: async () => {},
  onErrored: async () => {},
};

const defaultChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainType: CHAIN_TYPE.EVM,
  chainId: '1',
  name: 'default',
};

const defaultPepperLoginOptions: PepperLoginOptions = {
  chainConfig: defaultChainConfig,
  clientId: undefined,
  logLevel: DEFAULT_LEVEL,
  isMobile: false,
  isDevelopment: false,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private web3Auth: Web3AuthCore | any;
  private loginToken?: string;

  private _userInfo: UserInfo = defaultUserInfo;
  private _web3Info: Web3Info = {};
  private initialized = false;

  private openloginAdapter: OpenloginAdapter | null;
  private metamaskAdapter?: MetaMaskAdapter;
  private walletConnectAdapter?: WalletConnectAdapter;
  private storage = useStorage('local');
  private pepperApi: PepperApi;
  private subscriber?: EventSubscriber = defaultEventSubscriber;
  private currentStatus: LOGIN_STATUS_TYPE = LOGIN_STATUS.NOT_READY;
  private connectionIssued = false;

  #provider: Provider | null = null;
  #signer: PepperWallet | null = null;

  constructor(options?: Partial<PepperLoginOptions>) {
    this.options = defaultPepperLoginOptions;
    if (options) {
      this.options = { ...defaultPepperLoginOptions, ...options };
    }
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
        ...defaultChainConfig,
        ...options.chainConfig,
      };
    }

    const pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
    this.pepperApi = new PepperApi({
      accessToken: pepperAccessToken,
      isDevelopment: this.options.isDevelopment,
    });

    this.initialized = false;
    this.web3Auth = new Web3AuthCore({
      chainConfig: { chainNamespace: 'other' },
    });
    this.externalWalletConnection = this.externalWalletConnection.bind(this);
    this.onWalletConnectConnection = this.onWalletConnectConnection.bind(this);
    logger.info('Created pepper login instance');
  }

  public async init() {
    if (isElectron()) {
      this.initialized = true;
      return;
    }
    const uxMode: UX_MODE_TYPE = this.options.isMobile ? 'redirect' : 'popup';

    try {
      if (!this.openloginAdapter) {
        this.openloginAdapter = await openLoginAdapterBuilder(
          uxMode,
          WEB3AUTH_CLIENT_ID,
          this.options.chainConfig
        );
        this.web3Auth.configureAdapter(this.openloginAdapter);
      }
      if (this.web3Auth.status !== ADAPTER_STATUS.READY) {
        this.subscribeToAdapterEvents();
        await this.web3Auth.init();
      }

      this.loginToken = undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let walletConnectSettings: any = this.storage.getItem(WALLET_CONNECT_KEY);

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

      const cachedWallet = this.storage.getItem(PEPPER_CACHED_WALLET_KEY);

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
    return this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
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
    this.#signer = new ExternalWallet(signer);
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
    let pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);

    if (pepperAccessToken && !this.loginToken) {
      await this.hydratePepper(pepperAccessToken);
    } else {
      await this.pepperLogin();
    }

    pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
    if (pepperAccessToken) {
      this.storage.setItem(PEPPER_CACHED_WALLET_KEY, name);
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
      console.debug('Support for electron not available yet');
      return null;
    }

    try {
      await this.walletConnectAdapter?.connect(
        this.onWalletConnectConnection,
        this.options.chainConfig
      );
    } catch (e) {
      logger.error(e);
    }
    return this.#provider;
  }

  private async hydratePepper(accessToken: string) {
    this.storage.setItem(PEPPER_ACCESS_TOKEN_KEY, accessToken);
    this.pepperApi.setAccessToken(accessToken);
    this.currentStatus = LOGIN_STATUS.PEPPER_CONNECTED;
    this.loginToken = null;
    if (this.subscriber) {
      await this.subscriber.onConnected(
        this._userInfo,
        this.#provider,
        this.#signer,
        accessToken
      );
    }
    logger.info('Logged with Pepper');
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

    this.#signer = new InternalWallet(this.openloginAdapter);

    this.#provider = this.#signer.provider || null;

    this._userInfo.publicAddress = this.#signer.address;
    this._userInfo.publicKey = this.#signer.publicKey;
    // logger.debug("Current wallet: ", this.#signer);

    const pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
    // logger.debug("pepperAccessToken: ", pepperAccessToken);

    if (pepperAccessToken && !this.loginToken) {
      await this.hydratePepper(pepperAccessToken);
    } else {
      await this.pepperLogin();
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
          await this.hydratePepper(accessToken);
        }
      }
    } catch (e) {
      logger.error('Error while logging with pepper: ', e);
      await this.subscriber?.onErrored(e);
      this.currentStatus = LOGIN_STATUS.READY;
    }
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
    this.storage.removeItem(PEPPER_ACCESS_TOKEN_KEY);
    this.storage.removeItem(PEPPER_CACHED_WALLET_KEY);
    this.storage.removeItem(WALLET_CONNECT_KEY);

    this.web3Auth.clearCache();
    this.pepperApi.setAccessToken(null);
    this._userInfo = { ...defaultUserInfo };
    this._web3Info = {};
    await this.walletConnectAdapter?.disconnect();
    await this.init();
  }
}
