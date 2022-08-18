import {
  IS_DEV,
  PEPPER_APP_DEV_URL,
  PEPPER_APP_PROD_URL,
} from '../../config/constants';

import { createGuest } from './guest';
import { AllowedDomain, createHost } from './host';
import { Storage } from './utils';

export { createHost, createGuest };

let host: Storage = null;
let guest: Storage = null;

const ALLOWED_DOMAINS: AllowedDomain[] = [
  {
    origin: 'https://demo.peppergaming.com/',
    allowedMethods: ['get', 'set', 'remove'],
  },
];

const initializeHost = (): Storage => {
  host = createHost(ALLOWED_DOMAINS);
  return host;
};

const initializeGuest = (onConnection?: any): Storage => {
  tearDownSharedStorage();
  const isDev = IS_DEV || window.location.href.includes('localhost');
  const pepperUrl = isDev ? PEPPER_APP_DEV_URL : PEPPER_APP_PROD_URL;
  guest = createGuest(`${pepperUrl}/login-check`, onConnection);
  return guest;
};

export const initializeSharedStorage = (onConnection?: any) => {
  if (
    [PEPPER_APP_DEV_URL, PEPPER_APP_PROD_URL].some((url) =>
      window.location.href.includes(url)
    )
  ) {
    return initializeHost();
  } else {
    return initializeGuest(onConnection);
  }
};

export const tearDownSharedStorage = () => {
  if (host) {
    host.close();
    host = null;
  }

  if (guest) {
    guest.close();
    guest = null;
  }
};
