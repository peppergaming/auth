/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  IS_DEV,
  PEPPER_APP_DEV_URL,
  PEPPER_APP_PROD_URL,
} from '../../config/constants';

import { createGuest } from './guest';
import { AllowedDomain, createHost } from './host';
import { getDefaultStorage, Storage } from './utils';

export { createHost, createGuest };

let host: Storage | null = null;
let guest: Storage | null = null;

const ALLOWED_DOMAINS: AllowedDomain[] = [
  {
    origin: 'https://demo.peppergaming.com',
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

export const initializeSharedStorage = (
  onConnection?: any,
  isolated = true
) => {
  if (isolated) {
    return getDefaultStorage();
  }
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

export const deepHydrationAvailable = () => {
  try {
    return ALLOWED_DOMAINS.some((d) => window.location.href.includes(d.origin));
  } catch (e) {
    return false;
  }
};
