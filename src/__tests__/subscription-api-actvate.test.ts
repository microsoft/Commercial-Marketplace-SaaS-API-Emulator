import { activateApi } from '../subscription-api-impl';
import { expectStatus, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Activate Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  test('When no plan id in body returns 400', async () => {
    // Arrange
    //
    const req = {
      body: {}
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore();

    // Act
    //
    await activateApi(req, res, services);

    // Assert
    //
    expectStatus(res, 400);
  });

  test('When unknown subscription returns 404', async () => {
    // Arrange
    //
    const req = {
      body: {
        planId: 'plan'
      },
      params: {
        subscriptionId: 'subscription'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: undefined
    });

    // Act
    //
    await activateApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When subscription state is unsubscribed returns 404', async () => {
    // Arrange
    //
    const req = {
      body: {
        planId: 'plan'
      },
      params: {
        subscriptionId: 'subscription'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {
        saasSubscriptionStatus: 'Unsubscribed'
      }
    });

    // Act
    //
    await activateApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When plan is not the same as the subscription, returns 400', async () => {
    // Arrange
    //
    const req = {
      body: {
        planId: 'plan'
      },
      params: {
        subscriptionId: 'subscription'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {
        planId: 'plan1'
      }
    });

    // Act
    //
    await activateApi(req, res, services);

    // Assert
    //
    expectStatus(res, 400);
  });

  test('When valid, sets status, term start and end date and updates subscription, returns 200', async () => {
    // Arrange
    //
    const req = {
      body: {
        planId: 'plan'
      },
      params: {
        subscriptionId: 'subscription'
      }
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const subscription = {
      planId: 'plan',
      term: {
        startDate: undefined,
        endDate: undefined
      },
      saasSubscriptionStatus: 'Not subscribed'
    };

    const { services, updateSubscriptionAsync } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: subscription,
      updateSubscriptionAsync: true
    });

    // Act
    //
    await activateApi(req, res, services);

    // Assert
    //
    expect(subscription.term.startDate).toBeDefined();
    expect(subscription.term.endDate).toBeDefined();
    expect(subscription.saasSubscriptionStatus).toBe('Subscribed');
    expect(updateSubscriptionAsync?.mock.calls.length === 1);
    expectStatus(res, 200);
  });
});
