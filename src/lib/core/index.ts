import { ADAPTER_EVENTS, CONNECTED_EVENT_DATA } from '@web3auth/base';
import { Web3AuthCore } from '@web3auth/core';

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
}

const defaultPepperLoginOptions: PepperLoginOptions = {
  clientId: undefined,
  logLevel: DEFAULT_LEVEL,
  isMobile: false,
};

export class PepperLogin {
  readonly options: PepperLoginOptions;
  readonly web3AuthInstance: Web3AuthCore;

  constructor(options?: Partial<PepperLoginOptions>) {
    this.options = defaultPepperLoginOptions;
    if (options) {
      this.options = { ...defaultPepperLoginOptions, ...options };
    }
    setLoggerLevel(this.options.logLevel || DEFAULT_LEVEL);

    this.web3AuthInstance = new Web3AuthCore({
      chainConfig: { chainNamespace: 'other' },
    });
    logger.info('Created pepper login instance');
  }

  public async init() {
    const uxMode: UX_MODE_TYPE = this.options.isMobile ? 'redirect' : 'popup';

    const openLoginAdapter = await getOpenLoginAdapter(uxMode);
    this.web3AuthInstance.configureAdapter(openLoginAdapter);
    this.subscribeToAdapterEvents();
    await this.web3AuthInstance.init();
    logger.info('Initialized Pepper Login');
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
}
