import { updateSubscriptionApi } from '../subscription-api-impl';
import { RequestWithPublisher, Operation } from '../types';
import { expectStatus, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';

describe('Update Api Tests', () => {
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
    await updateSubscriptionApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When subscription not subscribed, returns 400', async () => {
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
      getSubscriptionAsync: {
        saasSubscriptionStatus: 'Not subscribed'
      }
    });

    // Act
    //
    await updateSubscriptionApi(req, res, services);

    // Assert
    //
    expectStatus(res, 400);
  });

  test('When pending operations, returns 400', async () => {
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
      getSubscriptionAsync: {
        saasSubscriptionStatus: 'Not subscribed'
      },
      getOperationsAsync: [
        {
          status: 'InProgress'
        }
      ]
    });

    // Act
    //
    await updateSubscriptionApi(req, res, services);

    // Assert
    //
    expectStatus(res, 400);
  });

  it.each([
    [undefined, undefined],
    ['plan', 10],
    [undefined, 'not a number'],
    [undefined, 0],
    [undefined, -10],
    [undefined, 10000000],
    [undefined, 100], // Quantity already exists on subscription
    ['existing plan', undefined] // Plan already exists on subscription
  ])(
    'Request body validation, when invalid returns 400',
    async (planId: string | undefined, quantity: string | number | undefined) => {
      // Arrange
      //
      const req = {
        publisherId: 'publisher',
        params: {
          subscriptionId: 'subscription id'
        },
        body: {
          planId,
          quantity
        }
      } as any as RequestWithPublisher;

      const { res } = mockResponse();

      const { services } = mockServicesContainerWithStateStore({
        getSubscriptionAsync: {
          saasSubscriptionStatus: 'Subscribed',
          planId: 'existing plan',
          quantity: 100
        },
        getOperationsAsync: [],
        getPlansForOfferAsync: [{ planId }]
      });

      // Act
      //
      await updateSubscriptionApi(req, res, services);

      // Assert
      //
      expectStatus(res, 400);
    }
  );

  it.each([
    [undefined, 10],
    ['new plan', undefined]
  ])('Returns 200', async (planId: string | undefined, quantity: string | number | undefined) => {
    // Arrange
    //
    const req = {
      publisherId: 'publisher',
      params: {
        subscriptionId: 'subscription id'
      },
      body: {
        planId,
        quantity
      },
      query: {
        'api-version': 'test'
      },
      get: jest.fn()
    } as any as RequestWithPublisher;

    const { res, setHeader } = mockResponse();

    const { services, updateSubscriptionAsync, addOperationAsync } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: {
        saasSubscriptionStatus: 'Subscribed',
        planId: 'existing plan'
      },
      getOperationsAsync: [],
      addOperationAsync: true,
      updateSubscriptionAsync: true,
      save: true,
      getPlansForOfferAsync: [{ planId }]
    });

    // Act
    //
    await updateSubscriptionApi(req, res, services);

    // Assert
    //
    const operation = addOperationAsync?.mock.calls[0][2] as Operation;

    if (planId !== undefined) {
      expect(operation.planId).toBe(planId);
      expect(operation.action).toBe('ChangePlan');
    } else {
      expect(operation.quantity).toBe(quantity);
      expect(operation.action).toBe('ChangeQuantity');
    }

    expect(setHeader.mock.calls[0][0].toLowerCase()).toBe('operation-location');
    expect(updateSubscriptionAsync?.mock.calls.length === 0);
    expectStatus(res, 202);
  });
});
