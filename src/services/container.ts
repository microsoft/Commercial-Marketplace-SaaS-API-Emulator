import { Config, StateStore } from '../types';
import DefaultStateStore from './default-state-store';
import { ContextService, createContextService } from './context';
import * as jwt from './jwt';
import { createLogger, Logger } from './logger';
import * as purchaseToken from './purchase-token-decoder';
import { createTokenService, TokenService } from './token-service';

export interface ServicesContainer {
  jwt: typeof jwt;
  purchaseToken: typeof purchaseToken;
  stateStore: StateStore;
  config: Config;
  context: ContextService;
  tokens: TokenService;
  logger: Logger;
}

export const createServicesContainer = (config: Config): ServicesContainer => {
  const contextService = createContextService();

  const logger = createLogger(contextService);

  const stateStore = new DefaultStateStore(config, logger);
  stateStore.load().catch((x) => {
    console.log(x);
  });

  return {
    jwt,
    purchaseToken,
    stateStore,
    config,
    context: contextService,
    tokens: createTokenService(),
    logger
  };
};
