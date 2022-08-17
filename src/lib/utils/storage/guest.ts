/* eslint-disable @typescript-eslint/no-explicit-any */

import useStorage from './hostStorage';
import { getId, Storage } from './utils';

const prefix = 'sessionAccessId-';

const createId = () => prefix + Date.now();

export const createGuest = (source, parent?): Storage => {
  parent = parent || document.body;

  const storage = useStorage();

  let contentWindow;
  let callbacks = {};
  const sessionRequests: any[] = [];
  let connected = false;
  let closed = true;
  let connectedTimeout;
  let isLoaded = false;

  const iframe: HTMLIFrameElement = document.createElement('iframe');
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
    }

    const id = createId();

    if (callbacks && typeof callback === 'function') {
      callbacks[id] = callback;
    }

    if (isLoaded) {
      contentWindow.postMessage(
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
        // @ts-ignore
        message(...args);
      }

      return;
    }

    message('connect');

    connectedTimeout = setTimeout(checkConnected, 125);
  }

  function openStorage() {
    parent.appendChild(iframe);
    contentWindow = iframe.contentWindow;
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
    if (!callback) {
      throw new Error('callback required for get');
    }
    message('get', key, null, callback);
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
