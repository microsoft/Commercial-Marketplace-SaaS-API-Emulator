import { ContextService } from './context';

export interface Logger {
  log: (message: string, source?: string | undefined) => void;
}

export const createLogger: (contextService: ContextService) => Logger = (contextService) => {
  return {
    log: (message, source?) => {
      const requestId = contextService.getRequestId();
      let pre: string | undefined;

      if (requestId !== undefined) {
        if (requestId.length > 8) {
          pre = `${requestId.substring(0, 4)}-${requestId.substring(requestId.length - 4, requestId.length)}`;
        } else {
          pre = requestId;
        }
      }

      console.log(`${pre === undefined ? '' : `[${pre}]`} ${source === undefined ? '' : `[${source}]`} ${message}`);
    }
  };
};
