import logger, {DEFAULT_LEVEL, LogLevel, setLoggerLevel} from "../config/logger";

interface PepperLoginOptions {

  clientId?: string;
  logLevel: LogLevel
}

const defaultPepperLoginOptions: PepperLoginOptions = {
  clientId: undefined,
  logLevel: DEFAULT_LEVEL
}

let instances = 0;


export class PepperLogin {

  readonly options: PepperLoginOptions;

  constructor(options?: Partial<PepperLoginOptions>) {
    this.options = defaultPepperLoginOptions;
    if (options) {
      this.options = {...defaultPepperLoginOptions, ...options}
    }
    setLoggerLevel(options?.logLevel || DEFAULT_LEVEL)
    logger.info("Created pepper login instance ", ++instances)
  }

  public async init() {
    logger.info("Initialized Pepper Login")
  }

}

