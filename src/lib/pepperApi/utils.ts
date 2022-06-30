import { PEPPER_API_DEV_URL, PEPPER_API_PROD_URL } from '../config/constants';

export const promiseTimeout = <T>(
  ms: number,
  promise: Promise<T>
): Promise<T> => {
  const timeout = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Timed out in ${ms}ms`));
    }, ms);
  });
  return Promise.race<T>([promise, timeout]);
};

export const getPepperAPIURL = (isDev = false) => {
  if (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    isDev
  ) {
    return PEPPER_API_DEV_URL;
  }
  return PEPPER_API_PROD_URL;
};

export type RequestMethod =
  | 'GET'
  | 'POST'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'PUT'
  | 'TRACE'
  | 'CONNECT';

export type UserWeb3Login = {
  auth_method: string;
  address: string;
  web3_identifier?: string;
  email?: string;
  username?: string;
  login_token?: string;
};

export type UserWeb3Verify = {
  message_prefix: string;
  address: string;
  public_key: string;
  signature: string;
};
