import { Response } from 'express';
import { ServicesContainer } from '../services/container';
import { Logger } from '../services/logger';

export const mockResponse: () => {
  res: Response;
  send: jest.Mock;
  sendStatus: jest.Mock;
  status: jest.Mock;
  setHeader: jest.Mock;
} = () => {
  const send = jest.fn();
  const status = jest.fn();
  const sendStatus = jest.fn();
  const setHeader = jest.fn();

  const res = { status, send, sendStatus, setHeader } as any as Response;

  send.mockReturnValue(res);
  status.mockReturnValue(res);
  sendStatus.mockReturnValue(res);
  setHeader.mockReturnValue(res);

  return {
    res,
    send,
    sendStatus,
    status,
    setHeader
  };
};

export const expectStatus = (res: Response, statusCode: number): void => {
  const sendStatus = res.sendStatus as jest.Mock;
  const status = res.status as jest.Mock;

  let expected: number;

  if (sendStatus.mock.calls.length > 0) {
    expected = sendStatus.mock.calls[0][0];
  } else if (status.mock.calls.length > 0) {
    expected = status.mock.calls[0][0];
  } else {
    fail();
  }

  expect(expected).toBe(statusCode);
};

export const expectResult = (res: Response, result: any): void => {
  expect((res.send as any).mock.calls[0][0]).toMatchObject(result);
};

export const mockServicesContainerWithStateStore: (mocks?: {
  addSubscriptionAsync?: any;
  updateSubscriptionAsync?: any;
  getSubscriptionsForPublisherAsync?: any;
  getSubscriptionAsync?: any;
  addOperationAsync?: any;
  getOperationsAsync?: any;
  getOperationAsync?: any;
  getPlansForOfferAsync?: any;
  save?: any;
}) => {
  services: ServicesContainer;
  addSubscriptionAsync?: jest.Mock;
  updateSubscriptionAsync?: jest.Mock;
  getSubscriptionsForPublisherAsync?: jest.Mock;
  getSubscriptionAsync?: jest.Mock;
  addOperationAsync?: jest.Mock;
  getOperationsAsync?: jest.Mock;
  getOperationAsync?: jest.Mock;
  getPlansForOfferAsync?: jest.Mock;
  save?: jest.Mock;
} = (mocks = {}) => {
  const stateStoreMocks = {};

  for (const i in mocks) {
    if (!Object.prototype.hasOwnProperty.call(mocks, i)) {
      continue;
    }
    const mock = jest.fn();
    const returnValue = (mocks as any)[i];
    if (returnValue !== undefined) {
      mock.mockReturnValue(Promise.resolve(returnValue));
    }
    (stateStoreMocks as any)[i] = mock;
  }

  const logger: Logger = {
    log: (message, source?) => {}
  };

  const services = {
    stateStore: { ...stateStoreMocks },
    logger
  } as any as ServicesContainer;

  return {
    services,
    ...stateStoreMocks
  };
};
