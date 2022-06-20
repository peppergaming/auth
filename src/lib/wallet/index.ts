import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { Wallet } from 'ethers';

import logger from '../config/logger';

export class PepperWallet extends Wallet {
  constructor(adapter: OpenloginAdapter) {
    if (
      !adapter ||
      !adapter.openloginInstance ||
      !(adapter.openloginInstance.privKey.length > 0)
    ) {
      logger.debug('Pepper wallet received an invalid adapter: ', adapter);
      throw new Error('Unable to instantiate Pepper Wallet');
    }
    super(`0x${adapter.openloginInstance.privKey}`);
  }
}
