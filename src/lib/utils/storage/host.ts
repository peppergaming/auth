/* eslint-disable @typescript-eslint/no-explicit-any */

import useStorage from './useStorage';
import { getId, Storage } from './utils';

const connectId = 'sessionAccessId-connected';

const storage = useStorage();

const hostStorage = {
  get(key: string, callback?: any) {
    const item = storage.getItem(key);
    if (callback) {
      callback(null, item);
    }
    return item;
  },
  set(key: string, value: string, callback?: any) {
    const item = storage.setItem(key, value);
    if (callback) {
      callback(null, item);
    }
    return item;
  },
  remove(key: string, callback?: any) {
    storage.removeItem(key);
    if (callback) {
      callback(null, null);
    }
    return;
  },
};

const guestStorage = {
  get(event: any, data: any) {
    event.source.postMessage(
      {
        id: data.id,
        data: storage.getItem(data.key),
      },
      event.origin
    );
  },
  set(event: any, data: any) {
    storage.setItem(data.key, data.value);

    event.source.postMessage(
      {
        id: data.id,
      },
      event.origin
    );
  },
  remove(event: any, data: any) {
    storage.removeItem(data.key);

    event.source.postMessage(
      {
        id: data.id,
      },
      event.origin
    );
  },
  connect(event: any) {
    event.source.postMessage(
      {
        id: connectId,
      },
      event.origin
    );
  },
};

type Method = 'get' | 'set' | 'remove';

export interface AllowedDomain {
  origin: string;
  allowedMethods: Method[];
}

export const createHost = (allowedDomains: AllowedDomain[]): Storage => {
  // TODO remove this log
  console.debug('creating host storage on domains: ', allowedDomains);

  let connected = false;
  const handleMessage = (event: any) => {
    const { data } = event;
    const domain = allowedDomains.find(
      (allowedDomain) => event.origin === allowedDomain.origin
    );
    const id = getId(data);

    if (!id) {
      return;
    }

    if (!domain) {
      event.source.postMessage(
        {
          id,
          connectError: true,
          error: `${event.origin} is not an allowed domain`,
        },
        event.origin
      );

      return;
    }

    const { method } = data;

    if (!~domain.allowedMethods.indexOf(method) && method !== 'connect') {
      event.source.postMessage(
        {
          id,
          error: `${method} is not an allowed method from ${event.origin}`,
        },
        event.origin
      );

      return;
    }

    // @ts-ignore
    guestStorage[method](event, data);
  };

  const close = () => {
    if (connected) {
      return;
    }
    window.removeEventListener('message', handleMessage);
    connected = false;
  };

  window.addEventListener('message', handleMessage);
  connected = true;
  return {
    type: 'host',
    ...hostStorage,
    close,
  };
};
