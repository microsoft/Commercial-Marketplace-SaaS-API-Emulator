import { operationsApi } from '../operations-api-impl';
import { expectResult, expectStatus, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Operations Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  test('When no unknown subscription, returns 404', async () => {
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
    await operationsApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When undefined operations, returns 200 with empty array', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Known'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationsAsync: undefined
    });

    // Act
    //
    await operationsApi(req, res, services);

    // Assert
    //
    expectStatus(res, 200);
    expectResult(res, []);
  });

  test('When multiple operations, returns 200 with only in-process operations', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Known'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const expectedOperations = [
      {
        id: 1,
        status: 'InProgress'
      },
      {
        id: 2,
        status: 'InProgress'
      }
    ];

    const unexpectedOperations = [
      {
        id: 1,
        status: 'Succeeded'
      },
      {
        id: 2,
        status: 'Failed'
      }
    ];

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationsAsync: [...expectedOperations, ...unexpectedOperations]
    });

    // Act
    //
    await operationsApi(req, res, services);

    // Assert
    //
    expectStatus(res, 200);
    expectResult(res, expectedOperations);
  });
});
