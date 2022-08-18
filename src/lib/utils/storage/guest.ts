/* eslint-disable @typescript-eslint/no-explicit-any */

import useStorage from './hostStorage';
import { getId, Storage } from './utils';

const prefix = 'sessionAccessId';
let messagesCount = 0;

const createId = (key: string) =>
  `${prefix}-${Date.now()}-${key}-${messagesCount}`;

export const createGuest = (source, onConnection?: any): Storage => {
  // TODO remove this log
  console.debug('creating guest storage on source: ', source);

  const parent = document.body;

  const storage = useStorage();

  let callbacks: any = {};
  const sessionRequests: any[] = [];
  let connected = false;
  let closed = true;
  let connectedTimeout;
  let isLoaded = false;

  const iframe: HTMLIFrameElement = document.createElement('iframe');
  iframe.id = `pepper-${createId('iframe')}`;
  iframe.src = source;
  iframe.width = '0';
  iframe.height = '0';
  iframe.style.display = 'none';
  iframe.onload = () => {
    isLoaded = true;
  };

  const handleMessage = (event) => {
    const response = event.data;
    const sessionAccessId = getId(response);

    if (sessionAccessId === 'sessionAccessId-connected') {
      // TODO remove this log
      console.debug('guest storage connected to: ', source);
      if (onConnection) {
        await onConnection();
      }
      connected = true;
      return;
    }

    if (response.connectError) {
      Object.keys(callbacks).forEach((key) => callbacks[key](response.error));
      callbacks = {};
      return;
    }

    const callback = callbacks[sessionAccessId];

    if (sessionAccessId && callback) {
      callback(response.error, response.data);
    }
  };

  function message(method, key?, value?, callback?) {
    if (closed) {
      openStorage();
    }

    if (!connected && method !== 'connect') {
      sessionRequests.push([method, key, value, callback]);
      return;
    }

    const id = createId(key || method);
    messagesCount++;

    if (callbacks && typeof callback === 'function') {
      callbacks[id] = callback;
    }

    if (isLoaded) {
      iframe.contentWindow.postMessage(
        {
          method,
          key,
          value,
          id,
        },
        source
      );
    }
  }

  function checkConnected() {
    if (connected) {
      clearTimeout(connectedTimeout);
      while (sessionRequests.length) {
        const args: any = sessionRequests.pop();
        try {
          // @ts-ignore
          message(...args);
        } catch (e) {
          console.debug(e);
        }
      }

      return;
    }

    message('connect');

    connectedTimeout = setTimeout(checkConnected, 125);
  }

  function openStorage() {
    parent.appendChild(iframe);
    closed = false;

    window.addEventListener('message', handleMessage);

    checkConnected();
  }

  openStorage();

  const close = () => {
    clearTimeout(connectedTimeout);
    window.removeEventListener('message', handleMessage);
    iframe.parentNode.removeChild(iframe);
    connected = false;
    closed = true;
  };

  const get = (key: string, callback) => {
    const innerCallback = async (_: any, data: any) => {
      if (data) {
        storage.setItem(key, data);
      }
      if (callback) {
        await callback();
      }
    };
    message('get', key, null, innerCallback);
    return storage.getItem(key);
  };

  const set = (key: string, value: string, callback) => {
    message('set', key, value, callback);
    return storage.setItem(key, value);
  };

  const remove = (key: string, callback) => {
    message('remove', key, null, callback);
    return storage.removeItem(key);
  };

  return {
    type: 'guest',
    get,
    set,
    remove,
    close,
  };
};
