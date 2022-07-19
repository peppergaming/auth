export interface EventSubscriber {
  onConnecting: () => Promise<void>;
  onConnected: (userInfo) => Promise<void>;
  onDisconnected: () => Promise<void>;
  onErrored: (error) => Promise<void>;
}
