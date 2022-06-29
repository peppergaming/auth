import {Provider} from '@ethersproject/providers';
import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  CONNECTED_EVENT_DATA,
  UserInfo,
  WALLET_ADAPTERS,
} from '@web3auth/base';
import {Web3AuthCore} from '@web3auth/core';
import {OpenloginAdapter} from '@web3auth/openlogin-adapter';

import {
  AUTH_METHODS,
  CHAIN_TYPE,
  LOGIN_PROVIDER_TYPE,
  LOGIN_STATUS,
  LOGIN_STATUS_TYPE,
  PEPPER_ACCESS_TOKEN_KEY,
  PERSONAL_SIGN_PREFIX,
} from '../config/constants';
import logger, {
  DEFAULT_LEVEL,
  LogLevel,
  setLoggerLevel,
} from '../config/logger';
import {PepperApi} from '../pepperApi';
import {useStorage} from '../util';
import {PepperWallet} from '../wallet';

import {getOpenLoginAdapter, UX_MODE_TYPE} from './adapters';

export interface PepperLoginOptions {
  chainType?: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE];
  clientId?: string;
  logLevel?: LogLevel;
  isMobile?: boolean;
  isDevelopment?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  web3Auth?: any;
}

const defaultPepperLoginOptions: PepperLoginOptions = {
  chainType: CHAIN_TYPE.EVM,
  clientId: undefined,
  logLevel: DEFAULT_LEVEL,
  isMobile: false,
  isDevelopment: false,
};

export interface UserWeb3Profile extends Partial<UserInfo> {
  publicAddress: string | null;
  publicKey: string | null;
}

const defaultUserWeb3Profile: UserWeb3Profile = {
  publicAddress: null,
  publicKey: null,
  name: '',
  typeOfLogin: '',
  email: '',
  verifierId: '',
};

export class PepperLogin {
  readonly options: PepperLoginOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly web3Auth: Web3AuthCore | any;

  private userInfo: UserWeb3Profile = defaultUserWeb3Profile;
  private initialized = false;

  private adapter: OpenloginAdapter | null;
  private storage = useStorage('local');
  private pepperApi: PepperApi;
  private currentStatus: LOGIN_STATUS_TYPE = LOGIN_STATUS.NOT_READY;
  #provider: Provider = null;
  #signer: PepperWallet = null;

  constructor(options?: Partial<PepperLoginOptions>) {
    this.options = defaultPepperLoginOptions;
    if (options) {
      this.options = {...defaultPepperLoginOptions, ...options};
    }
    setLoggerLevel(this.options.logLevel || DEFAULT_LEVEL);
    if (this.options.web3Auth) {
      this.web3Auth = this.options.web3Auth;
      this.adapter = this.web3Auth.walletAdapters[WALLET_ADAPTERS.OPENLOGIN];
    } else {
      this.web3Auth = new Web3AuthCore({
        chainConfig: {chainNamespace: 'other'},
      });
      this.adapter = null;
      const pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
      this.pepperApi = new PepperApi({
        accessToken: pepperAccessToken,
        isDevelopment: this.options.isDevelopment,
      });
      this.initialized = false;
    }

    logger.info('Created pepper login instance');
  }

  public async init() {
    const uxMode: UX_MODE_TYPE = this.options.isMobile ? 'redirect' : 'popup';
    try {
      if (this.web3Auth && this.web3Auth.status !== ADAPTER_STATUS.READY) {
        const openLoginAdapter = await getOpenLoginAdapter(uxMode);
        this.adapter = openLoginAdapter;
        this.web3Auth.configureAdapter(openLoginAdapter);
        this.subscribeToAdapterEvents();
        await this.web3Auth.init();
      }
      this.initialized = true;
      this.currentStatus = LOGIN_STATUS.READY;
      logger.info('Initialized Pepper Login');
      logger.debug('Current web3Auth currentStatus: ', this.web3Auth.status);
    } catch (e) {
      logger.error('Error while initializing PepperLogin: ', e);
    }
  }

  get getUserInfo(): Partial<UserInfo> | null {
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

  private subscribeToAdapterEvents() {
    const web3Auth = this.web3Auth;
    web3Auth.on(ADAPTER_EVENTS.CONNECTING, () => {
      this.currentStatus = LOGIN_STATUS.CONNECTING;
      logger.debug('Connecting');
    });

    web3Auth.on(
      ADAPTER_EVENTS.CONNECTED,
      async (data: CONNECTED_EVENT_DATA) => {
        this.currentStatus = LOGIN_STATUS.CONNECTED;
        await this.hydrateSession();
        logger.info('Connected');
        logger.debug('Connected with data: ', data);
      }
    );

    web3Auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      this.currentStatus = LOGIN_STATUS.READY;
      logger.debug('Disconnected');
    });

    web3Auth.on(ADAPTER_EVENTS.ERRORED, (error) => {
      this.currentStatus = LOGIN_STATUS.READY;
      logger.error(error);
    });
  }

  public async connectTo(
    loginProvider: LOGIN_PROVIDER_TYPE,
    loginHint?: string
  ) {
    if (
      !this.initialized ||
      !this.adapter ||
      this.adapter.status === ADAPTER_STATUS.NOT_READY
    ) {
      logger.error(
        'Pepper Login is not initialized yet! Please call init first.'
      );
      // logger.debug('Current web3auth: ', this.web3Auth);
      return null;
    }

    if (this.web3Auth.status === ADAPTER_STATUS.CONNECTED) {
      logger.warn('Already connected');
      return this.#signer;
    }

    try {
      logger.debug('Trying to connect with: ', loginProvider);
      const loginParams = {
        loginProvider,
        login_hint: loginHint,
      };
      logger.debug('Login params: ', loginParams);

      const localProvider = await this.web3Auth.connectTo(
        this.adapter.name,
        loginParams
      );

      if (localProvider && this.currentStatus !== LOGIN_STATUS.HYDRATING) {
        await this.hydrateSession();
      }
    } catch (e) {
      logger.error('Error while connecting with google: ', e);
      if (this.web3Auth.loginModal) {
          this.web3Auth.loginModal.closeModal();
      }
    }
    return this.#signer;
  }

  private hydratePepper(accessToken: string) {
    this.storage.setItem(PEPPER_ACCESS_TOKEN_KEY, accessToken);
    this.pepperApi.setAccessToken(accessToken);
    this.currentStatus = LOGIN_STATUS.PEPPER_CONNECTED;
    logger.info('Logged with Pepper');
  }

  private async hydrateSession() {
    if (this.currentStatus === LOGIN_STATUS.HYDRATING) {
      return;
    }
    this.currentStatus = LOGIN_STATUS.HYDRATING;

    const userInfo = await this.web3Auth.getUserInfo();
    this.userInfo = {
      ...defaultUserWeb3Profile,
      ...userInfo,
    };
    console.debug('Current user info: ', this.userInfo);

    this.#signer = new PepperWallet(this.adapter);
    this.#provider = this.#signer.provider;
    this.userInfo.publicAddress = this.#signer.address;
    this.userInfo.publicKey = this.#signer.publicKey;
    logger.debug('Current wallet: ', this.#signer);

    const pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);

    if (pepperAccessToken) {
      this.hydratePepper(pepperAccessToken);
    } else {
      await this.pepperLogin();
    }

    await this.pepperLogin();
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
      };
      const initResponse = await this.pepperApi.postWeb3Init(userWeb3Login);
      if (initResponse && initResponse['nonce']) {
        this.currentStatus = LOGIN_STATUS.PEPPER_VERIFY;

        const nonce = initResponse['nonce'];
        const message = PERSONAL_SIGN_PREFIX + nonce;

        const signature = await this.#signer.signMessage(message);

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
          this.hydratePepper(accessToken);
        }
      }
    } catch (e) {
      logger.error('Error while logging with pepper: ', e);
      this.currentStatus = LOGIN_STATUS.READY;
    }
  }

  public async logout() {
    logger.warn('Logging out');
    try {
      if (this.web3Auth && this.web3Auth.status === ADAPTER_STATUS.CONNECTED) {
        await this.web3Auth.logout({cleanup: false});
      }
      if (this.adapter && this.adapter.status === ADAPTER_STATUS.CONNECTED) {
        await this.adapter.disconnect();
      }
    } catch (e) {
      // console.error("Could not log out web3auth: ", e);
    }
    this.currentStatus = LOGIN_STATUS.READY;
    this.storage.removeItem(PEPPER_ACCESS_TOKEN_KEY);
    this.pepperApi.setAccessToken(null);
  }
}
