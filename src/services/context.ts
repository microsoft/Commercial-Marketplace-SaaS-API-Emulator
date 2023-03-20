import { AsyncLocalStorage } from 'async_hooks';

export interface ContextService {
  setRequestId: (requestId: string) => void;
  getRequestId: () => string;
}

export interface Context {
  requestId: string | undefined;
}

export const createContextService: () => ContextService = () => {
  const asyncLocal = new AsyncLocalStorage<Context>();

  return {
    setRequestId: (requestId: string) => {
      asyncLocal.enterWith({
        requestId
      });
    },

    getRequestId: () => {
      const store = asyncLocal.getStore();
      return store?.requestId ?? "";
    }
  };
};
