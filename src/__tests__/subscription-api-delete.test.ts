import { deleteSubscriptionApi } from '../subscription-api-impl';
import { expectStatus, mockNotificationService, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Delete Api Tests', () => {
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

    let { services } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: undefined
    });

    services = {
      ...services,
      notifications: mockNotificationService()
    }

    // Act
    //
    await deleteSubscriptionApi(req, res, services);

    // Assert
    //
    expectStatus(res, 404);
  });

  test('When valid changes state, updates store and returns 202', async () => {
    // Arrange
    //
    const req = {
      publisherId: 'publisher',
      params: {
        subscriptionId: 'subscription id'
      },
      query: {
        'api-version': 'test'
      },
      get: jest.fn()
    } as any as RequestWithPublisher;

    const { res, setHeader } = mockResponse();

    const subscription = {
      saasSubscriptionStatus: 'Anything'
    };

    let { services, updateSubscriptionAsync } = mockServicesContainerWithStateStore({
      getSubscriptionAsync: subscription,
      addOperationAsync: true,
      updateSubscriptionAsync: true
    });

    services = {
      ...services,
      notifications: mockNotificationService()
    }

    // Act
    //
    await deleteSubscriptionApi(req, res, services);

    // Assert
    //
    expect(setHeader.mock.calls[0][0].toLowerCase()).toBe('operation-location');
    expect(updateSubscriptionAsync?.mock.calls.length === 0);
    expectStatus(res, 202);
  });
});
