import { operationApi } from '../operations-api-impl';
import { expectResult, expectStatus, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Operation Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  test('When unknown subscription id, returns 404', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Unknown'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: undefined
    });

    // Act
    //
    await operationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When unknown operation id, returns 404', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Known',
        operationId: 'Unknown'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationAsync: undefined
    });

    // Act
    //
    await operationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When operation exists, returns 200', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Known',
        operationId: 'Known'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const expectedOperation = {
      id: 1,
      status: 'InProgress'
    };

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationAsync: expectedOperation
    });

    // Act
    //
    await operationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 200);
    expectResult(res, expectedOperation);
  });
});
