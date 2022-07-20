export interface EventSubscriber {
  onConnecting: () => Promise<void>;
  onConnected: (userInfo, pepperAccessToken) => Promise<void>;
  onDisconnected: () => Promise<void>;
  onErrored: (error) => Promise<void>;
}
