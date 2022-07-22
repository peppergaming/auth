/* eslint-disable @typescript-eslint/no-empty-function */

import { Provider, Web3Provider } from '@ethersproject/providers';
import { CONNECTED_EVENT_DATA, UserInfo } from '@web3auth/base';
import { Web3AuthCore } from '@web3auth/core';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { ethers } from 'ethers';

import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  AUTH_METHODS,
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

export interface EventSubscriber {
  onConnecting?: () => Promise<void>;
  onAuthChallengeSigning?: () => Promise<void>;
  onConnected?: (userInfo, pepperAccessToken) => Promise<void>;
  onDisconnected?: () => Promise<void>;
  onErrored?: (error) => Promise<void>;
}

export interface PepperLoginOptions {
  chainType?: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE];
  clientId?: string;
  logLevel?: LogLevel;
  isMobile?: boolean;
  isDevelopment?: boolean;
  eventSubscriber?: EventSubscriber;
}

export interface UserWeb3Profile extends Partial<UserInfo> {
  publicAddress: string | null;
  publicKey: string | null;
}

const defaultEventSubscriber: EventSubscriber = {
  onConnecting: async () => {},
  onAuthChallengeSigning: async () => {},
  onConnected: async () => {},
  onDisconnected: async () => {},
  onErrored: async () => {},
};

const defaultPepperLoginOptions: PepperLoginOptions = {
  chainType: CHAIN_TYPE.EVM,
  clientId: undefined,
  logLevel: DEFAULT_LEVEL,
  isMobile: false,
  isDevelopment: false,
};

const defaultUserWeb3Profile: UserWeb3Profile = {
  publicAddress: null,
  publicKey: null,
  name: '',
  typeOfLogin: '',
  email: undefined,
  verifierId: '',
};

export class PepperLogin {
  readonly options: PepperLoginOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private web3Auth: Web3AuthCore | any;
  private loginToken?: string;

  private userInfo: UserWeb3Profile = defaultUserWeb3Profile;
  private initialized = false;

  private openloginAdapter: OpenloginAdapter | null;
  private metamaskAdapter?: MetaMaskAdapter;
  private walletConnectAdapter?: WalletConnectAdapter;
  private storage = useStorage('local');
  private pepperApi: PepperApi;
  private subscriber?: EventSubscriber;
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

    if (this.options.eventSubscriber) {
      this.subscriber = {
        ...defaultEventSubscriber,
        ...this.options.eventSubscriber,
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
        this.openloginAdapter = await openLoginAdapterBuilder(uxMode);
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
      // logger.debug('Current user info: ', this.userInfo);
    } catch (e) {
      logger.error('Error while initializing PepperLogin: ', e);
    }
  }

  get getUserInfo(): Partial<UserWeb3Profile> | null {
    return this.userInfo;
  }

  get isInitialized(): boolean {
    return this.initialized;
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
    this.userInfo = {
      ...defaultUserWeb3Profile,
      publicAddress: address,
      name: generateNickname(null, address.substring(2, 5)),
      typeOfLogin: 'wallet',
      verifier: 'address',
      verifierId: address,
    };
    let pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
    // logger.debug("pepperAccessToken: ", pepperAccessToken);

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
      const provider = await this.metamaskAdapter?.connect();
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
      await this.walletConnectAdapter?.connect(this.onWalletConnectConnection);
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
      await this.subscriber.onConnected(this.userInfo, accessToken);
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

    this.userInfo = {
      ...defaultUserWeb3Profile,
      ...userInfo,
    };
    // logger.debug('Current user info: ', this.userInfo);
    // logger.debug('Web3auth  user info: ', userInfo);

    this.#signer = new InternalWallet(this.openloginAdapter);

    this.#provider = this.#signer.provider || null;
    this.userInfo.publicAddress = this.#signer.address;
    this.userInfo.publicKey = this.#signer.publicKey;
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
        address: this.userInfo.publicAddress,
        auth_method: AUTH_METHODS[this.userInfo.typeOfLogin] || '',
        email: this.userInfo.email,
        username: this.userInfo.name,
        web3_identifier: this.userInfo.verifierId || '',
        login_token: this.loginToken || undefined,
      };
      const initResponse = await this.pepperApi.postWeb3Init(userWeb3Login);
      let publicKey = this.userInfo.publicKey;
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
          public_key: this.userInfo.publicKey || '',
          address: this.userInfo.publicAddress || '',
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
    this.userInfo = { ...defaultUserWeb3Profile };
    await this.walletConnectAdapter?.disconnect();
    await this.init();
  }
}
