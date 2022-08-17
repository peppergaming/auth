/* eslint-disable @typescript-eslint/no-explicit-any */

const prefix = 'sessionAccessId-';
export const getId = (data) => {
  let id;

  if (data && data.id && ~data.id.indexOf(prefix)) {
    id = data.id;
  }

  return id;
};

export interface Storage {
  type: 'host' | 'guest';
  get: (key: string, callback?: any) => string;
  set: (key: string, value: string, callback?: any) => boolean;
  remove: (key: string, callback?: any) => void;
  close: () => void;
}
