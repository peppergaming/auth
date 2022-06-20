import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  CONNECTED_EVENT_DATA,
} from '@web3auth/base';
import { Web3AuthCore } from '@web3auth/core';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import {
  CHAIN_TYPE,
  LOGIN_PROVIDER_TYPE,
  PEPPER_ACCESS_TOKEN_KEY,
  PERSONAL_SIGN_PREFIX,
} from '../config/constants';
import logger, {
  DEFAULT_LEVEL,
  LogLevel,
  setLoggerLevel,
} from '../config/logger';
import { PepperApi } from '../pepperApi';
import { useStorage } from '../util';

import { getOpenLoginAdapter, UX_MODE_TYPE } from './adapters';

interface PepperLoginOptions {
  chainType?: typeof CHAIN_TYPE[keyof typeof CHAIN_TYPE];
  clientId?: string;
  logLevel?: LogLevel;
  isMobile?: boolean;
  isDevelopment?: boolean;
}

const defaultPepperLoginOptions: PepperLoginOptions = {
  chainType: CHAIN_TYPE.EVM,
  clientId: undefined,
  logLevel: DEFAULT_LEVEL,
  isMobile: false,
  isDevelopment: false,
};

export class PepperLogin {
  readonly options: PepperLoginOptions;
  readonly web3AuthInstance: Web3AuthCore;
  private adapter: OpenloginAdapter | null;
  // TODO replace this with a wallet instance
  private provider: any = null;
  private signer: any = null;
  private storage = useStorage('local');
  private pepperApi: PepperApi;
  public initialized = false;

  // TODO implement re-hydration
  constructor(options?: Partial<PepperLoginOptions>) {
    this.options = defaultPepperLoginOptions;
    if (options) {
      this.options = { ...defaultPepperLoginOptions, ...options };
    }
    setLoggerLevel(this.options.logLevel || DEFAULT_LEVEL);

    this.web3AuthInstance = new Web3AuthCore({
      chainConfig: { chainNamespace: 'other' },
    });
    this.adapter = null;
    const pepperAccessToken = this.storage.getItem(PEPPER_ACCESS_TOKEN_KEY);
    this.pepperApi = new PepperApi({
      accessToken: pepperAccessToken,
      isDevelopment: this.options.isDevelopment,
    });
    this.initialized = false;
    logger.info('Created pepper login instance');
  }

  public async init() {
    const uxMode: UX_MODE_TYPE = this.options.isMobile ? 'redirect' : 'popup';
    try {
      const openLoginAdapter = await getOpenLoginAdapter(uxMode);
      this.adapter = openLoginAdapter;
      this.web3AuthInstance.configureAdapter(openLoginAdapter);
      this.subscribeToAdapterEvents();
      await this.web3AuthInstance.init();
      this.initialized = true;
      logger.info('Initialized Pepper Login');
    } catch (e) {
      logger.error('Error while initializing PepperLogin: ', e);
    }
  }

  private subscribeToAdapterEvents() {
    const web3Auth = this.web3AuthInstance;
    web3Auth.on(ADAPTER_EVENTS.CONNECTING, () => {
      logger.debug('Connecting');
    });

    web3Auth.on(ADAPTER_EVENTS.CONNECTED, (data: CONNECTED_EVENT_DATA) => {
      logger.info('Connected');
      logger.debug('Connected with data: ', data);
    });

    web3Auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      logger.debug('Disconnected');
    });

    web3Auth.on(ADAPTER_EVENTS.ERRORED, (error) => {
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
      return;
    }

    try {
      logger.debug('Trying to connect with: ', loginProvider);
      const localProvider = await this.web3AuthInstance.connectTo(
        this.adapter.name,
        {
          loginProvider,
          loginHint,
        }
      );

      if (localProvider && this.signer) {
        // FIXME setup a new wallet and save it in current instance
        // FIXME query user infos and save them in current instance
        this.provider = localProvider;
        await this.pepperLogin();
      }
    } catch (e) {
      logger.error('Error while connecting with google: ', e);
    }

    return this.provider;
  }

  private async pepperLogin() {
    // FIXME replace this condition with signer
    if (!this.provider) {
      logger.error('Cannot login with pepper without a signer');
    }

    // FIXME use proper value from web3Auth
    const userWeb3Login = {
      address: '',
      auth_method: '',
      email: '',
      username: '',
      web3_identifier: '',
    };
    const initResponse = await this.pepperApi.postWeb3Init(userWeb3Login);
    if (initResponse && initResponse['nonce']) {
      const nonce = initResponse['nonce'];
      const message = PERSONAL_SIGN_PREFIX + nonce;

      // FIXME get proper signature from signer
      const signature = message + 'signed';

      // FIXME get proper public key from real signature
      const publicKey = message + 'public';

      const userWeb3Verify = {
        public_key: publicKey || '',
        address: '',
        // signature: signatureCompact || "",
        signature: signature || '',
        message_prefix: PERSONAL_SIGN_PREFIX,
      };
      const verifyResponse = await this.pepperApi.postWeb3Verify(
        userWeb3Verify
      );

      if (verifyResponse && verifyResponse['access_token']) {
        const accessToken = verifyResponse['access_token'];
        this.storage.setItem(PEPPER_ACCESS_TOKEN_KEY, accessToken);
        this.pepperApi.setAccessToken(accessToken);
      }
    }
  }
}