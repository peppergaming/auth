import {
  ADAPTER_EVENTS,
  ADAPTER_STATUS,
  CONNECTED_EVENT_DATA,
} from '@web3auth/base';
import { Web3AuthCore } from '@web3auth/core';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';

import { LOGIN_PROVIDER_TYPE } from '../config/constants';
import logger, {
  DEFAULT_LEVEL,
  LogLevel,
  setLoggerLevel,
} from '../config/logger';

import { getOpenLoginAdapter, UX_MODE_TYPE } from './adapters';

interface PepperLoginOptions {
  clientId?: string;
  logLevel: LogLevel;
  isMobile: boolean;
  isDevelopment: boolean;
}

const defaultPepperLoginOptions: PepperLoginOptions = {
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
  public initialized = false;

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

      if (localProvider) {
        this.provider = localProvider;
      }
    } catch (e) {
      logger.error('Error while connecting with google: ', e);
    }

    return this.provider;
  }
}
