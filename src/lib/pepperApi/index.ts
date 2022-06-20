import logger from '../config/logger';

import { getPepperAPIURL, UserWeb3Login, UserWeb3Verify } from './utils';

export interface PepperApiOptions {
  accessToken: string | null;
  isDevelopment: boolean;
}

export const defaultPepperApiOptions = {
  accessToken: null,
  isDevelopment: false,
};

export class PepperApi {
  readonly options: PepperApiOptions;
  private pepperAPIURL: string;
  // TODO Add re-hydration of access token
  private accessToken: string | null;
  private defaultHeaders = new Headers({
    'Content-Type': 'application/json',
  });

  constructor(options: Partial<PepperApiOptions> = defaultPepperApiOptions) {
    if (options) {
      this.options = { ...defaultPepperApiOptions, ...options };
    }
    this.pepperAPIURL = getPepperAPIURL(this.options.isDevelopment);
    this.accessToken = this.options.accessToken;
  }

  private getHeaders() {
    if (this.accessToken) {
      this.defaultHeaders.append('Authorization', `Bearer ${this.accessToken}`);
    } else if (this.defaultHeaders.has('Authorization')) {
      this.defaultHeaders.delete('Authorization');
    }
    return this.defaultHeaders;
  }

  public async request<T>(
    path: string,
    requestOptions: RequestInit,
    data?: BodyInit
  ) {
    const method = requestOptions.method || 'GET';
    requestOptions = { ...requestOptions, headers: this.getHeaders() };
    if (data && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = data;
    }
    const url = `${this.pepperAPIURL}${path}`;
    const response = await fetch(url, requestOptions);

    if (response.ok) {
      return response.json() as Promise<T>;
    }
    throw response;
  }

  public setAccessToken(value: string | null) {
    this.accessToken = value;
  }

  public async get<T>(path: string, requestOptions) {
    requestOptions.method = 'GET';
    return await this.request<T>(path, requestOptions);
  }

  public async post<T>(path: string, requestOptions, data: BodyInit) {
    requestOptions.method = 'POST';
    return await this.request<T>(path, requestOptions, data);
  }

  public async postWeb3Init(userWeb3Login: UserWeb3Login) {
    try {
      return await this.post(
        '/auth/web3/init',
        {},
        JSON.stringify(userWeb3Login)
      );
    } catch (e) {
      // TODO throw this error if needed
      logger.error(e);
    }
  }

  public async postWeb3Verify(userWeb3verify: UserWeb3Verify) {
    try {
      // TODO parse this result and save access token
      return await this.post(
        '/auth/web3/verify',
        {},
        JSON.stringify(userWeb3verify)
      );
    } catch (e) {
      // TODO throw this error if needed
      logger.error(e);
    }
  }
}
