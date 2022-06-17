import log from 'loglevel';
import logPrefix from 'loglevel-plugin-prefix';

export type LogLevel = log.LogLevelDesc;

export const DEFAULT_LEVEL: LogLevel = 'error';
export const LOGGER_PREFIX = 'pepper';

logPrefix.apply(log, {
  format(level, name, timestamp) {
    return `[${timestamp}] ${level} ${name}:`;
  },
});

const logger = log.getLogger('pepper');

logger.setLevel(DEFAULT_LEVEL);

export const setLoggerLevel = (level: LogLevel) => {
  logger.setLevel(level);
};

export const getLogger = (name: string, level: LogLevel = DEFAULT_LEVEL) => {
  const customLogger = log.getLogger(`${LOGGER_PREFIX} ${name}`);
  customLogger.setLevel(level);
};

export default logger;
