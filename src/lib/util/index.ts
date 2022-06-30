import {
  PEPPER_APP_DEV_URL,
  PEPPER_APP_OAUTH_PATH,
  PEPPER_APP_PROD_URL,
} from '../config/constants';

export { default as useStorage } from './storage';

export const isElectron = () => {
  return process && 'electron' in process.versions;
};

export const getPepperOauthURL = (isDev: boolean) => {
  const pepperAppPath = isDev ? PEPPER_APP_DEV_URL : PEPPER_APP_PROD_URL;
  return `${pepperAppPath}/${PEPPER_APP_OAUTH_PATH}`;
};
