/* eslint-disable @typescript-eslint/no-explicit-any */

import useStorage from './useStorage';

const prefix = 'sessionAccessId-';
export const getId = (data: any) => {
  let id;

  if (data && data.id && ~data.id.indexOf(prefix)) {
    id = data.id;
  }

  return id;
};

export interface Storage {
  type: 'default' | 'host' | 'guest';
  get: (key: string, callback?: any) => string;
  set: (key: string, value: string, callback?: any) => boolean;
  remove: (key: string, callback?: any) => void;
  close: () => void;
}

export const getDefaultStorage = (): Storage => {
  const storage = useStorage();
  return {
    type: 'default',
    get(key: string, callback?) {
      const item = storage.getItem(key);
      if (callback) {
        callback(null, item);
      }
      return item;
    },
    set(key: string, value: string, callback?) {
      const item = storage.setItem(key, value);
      if (callback) {
        callback(null, item);
      }
      return item;
    },
    remove(key: string, callback?) {
      storage.removeItem(key);
      if (callback) {
        callback(null, null);
      }
      return;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    close: () => {},
  };
};
