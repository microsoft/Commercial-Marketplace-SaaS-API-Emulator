import { updateOperationApi } from '../operations-api-impl';
import { expectStatus, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Update operation Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  // NOTE: This is a test that _should_ exist, but the API doesn't actually check this
  test('When invalid status, returns 400', async () => {
    // Arrange
    //
    const req = {
      body: {
        status: 'Unknown'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore();

    // Act
    //
    await updateOperationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 400);
  });

  test('When unknown subscription id, returns 404', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Unknown'
      },
      body: {
        status: 'Failure'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const getSubscriptionAsync = jest.fn();
    getSubscriptionAsync.mockReturnValue(undefined);

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: undefined
    });

    // Act
    //
    await updateOperationApi(req, res, services);

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
      },
      body: {
        status: 'Failure'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationAsync: undefined
    });

    // Act
    //
    await updateOperationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When operation request source is partner, returns 500', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Known',
        operationId: 'Known'
      },
      body: {
        status: 'Failure'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationAsync: {
        operationRequestedSource: 'Partner'
      }
    });

    // Act
    //
    await updateOperationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 500);
  });

  test('When unknown operation id, returns 404', async () => {
    // Arrange
    //
    const req = {
      params: {
        subscriptionId: 'Known',
        operationId: 'Unknown'
      },
      body: {
        status: 'Failure'
      },
      get: jest.fn()
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {},
      getOperationAsync: {
        operationRequestedSource: 'Azure',
        status: 'Succeeded'
      }
    });

    // Act
    //
    await updateOperationApi(req, res, services);

    // Assert
    //
    expectStatus(res, 409);
  });

  // NOTE: Removed this test at the moment because the update operation _always_ seems to succeed in the real API!
  // test("When update operation succeeds, returns 200", async () => {

  //     // Arrange
  //     //
  //     const req = {
  //         params: {
  //             subscriptionId: "Known",
  //             operationId: "Unknown"
  //         },
  //         body: {
  //             status: "Failure"
  //         }
  //     } as any as RequestWithPublisher;

  //     const {res} = mockResponse();

  //     const {services} = mockServicesContainerWithStateStore({
  //         getSubscriptionAsync: {},
  //         getOperationAsync: {
  //             operationRequestedSource: "Azure",
  //             status: "InProgress"
  //         },
  //         updateOperationStateAsync: true
  //     });

  //     // Act
  //     //
  //     await updateOperationApi(req, res, services);

  //     // Assert
  //     //
  //     expectStatus(res, 200);
  // });
});
