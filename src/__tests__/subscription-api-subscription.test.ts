import { getSubscriptionApi } from '../subscription-api-impl';
import { expectResult, expectStatus, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Subscription Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  test('When invalid subscription id, returns 404', async () => {
    // Arrange
    //
    const req = {
      publisherId: 'publisher',
      params: {
        subscriptionId: 'subscription id'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: undefined
    });

    // Act
    //
    await getSubscriptionApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When valid subscription id, returns the subscription', async () => {
    // Arrange
    //
    const req = {
      publisherId: 'publisher',
      params: {
        subscriptionId: 'subscription id'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const subscription = {
      id: 'test'
    };

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: subscription
    });

    // Act
    //
    await getSubscriptionApi(req, res, services);

    // Assert
    //
    expectResult(res, subscription);
    expectStatus(res, 200);
  });
});
