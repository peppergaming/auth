/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  PEPPER_APP_DEV_URL,
  PEPPER_APP_OAUTH_PATH,
  PEPPER_APP_PROD_URL,
} from '../config/constants';

export { default as useStorage } from './storage/hostStorage';

export { generateNickname } from './nicknames';

export const isElectron = () => {
  return process && 'electron' in process.versions;
};

export const getPepperOauthURL = (isDev: boolean) => {
  const pepperAppPath = isDev ? PEPPER_APP_DEV_URL : PEPPER_APP_PROD_URL;
  return `${pepperAppPath}/${PEPPER_APP_OAUTH_PATH}`;
};

/**
 * Random chooser for arrays
 * @param sourceArray
 * @returns {any}
 */
export const getRandomElement: (sourceArray: any[]) => any = (
  sourceArray: any[]
) => {
  if (!sourceArray || sourceArray.length === 0) {
    return null;
  }
  return sourceArray[Math.floor(Math.random() * sourceArray.length)];
};
