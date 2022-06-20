type StorageType = 'session' | 'local';
type UseStorageReturnValue = {
  getItem: (key: string, type?: StorageType) => string;
  setItem: (key: string, value: string, type?: StorageType) => boolean;
  removeItem: (key: string, type?: StorageType) => void;
};

const useStorage = (
  defaultType: StorageType = 'local'
): UseStorageReturnValue => {
  const storageType = (type?: StorageType): string =>
    `${type ?? 'session'}Storage`;

  const isBrowser: boolean = ((): boolean => typeof window !== 'undefined')();

  const getItem = (key: string, type: StorageType = defaultType): string => {
    window.localStorage;
    return isBrowser ? window[storageType(type)].getItem(key) : null;
  };

  const setItem = (
    key: string,
    value: string,
    type: StorageType = defaultType
  ): boolean => {
    if (isBrowser) {
      window[storageType(type)].setItem(key, value);
      return true;
    }
    return false;
  };

  const removeItem = (key: string, type: StorageType = defaultType): void => {
    window[storageType(type)].removeItem(key);
  };

  return {
    getItem,
    setItem,
    removeItem,
  };
};

export default useStorage;
