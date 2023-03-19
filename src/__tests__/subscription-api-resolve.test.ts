import { resolveApi } from '../subscription-api-impl';
import { generateSubscription } from '../helpers/subscription-helper';
import { ServicesContainer } from '../services/container';
import { expectResult, expectStatus, mockNotificationService, mockResponse } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Resolve Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  it.each([
    [undefined, undefined],
    ['valid token', undefined],
    ['valid token', {}]
  ])('Returns 400', async (marketplaceToken: string | undefined, purchaseProperties: any | undefined) => {
    // Arrange
    //
    const mockedGet = jest.fn();
    mockedGet.mockReturnValue(marketplaceToken);

    const req = {
      get: mockedGet
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const decodeToken = jest.fn();
    decodeToken.mockReturnValue(purchaseProperties);

    const services = {
      purchaseToken: {
        decodeToken
      },
      notifications: mockNotificationService()
    } as any as ServicesContainer;

    // Act
    //
    await resolveApi(req, res, services);

    // Assert
    //
    expectStatus(res, 400);
  });

  test("When subscription doesn't exist, adds to store and returns 200", async () => {
    // Arrange
    //
    const publisherId = 'publisher';

    const mockedGet = jest.fn();
    mockedGet.mockReturnValue('valid token');

    const req = {
      get: mockedGet,
      publisherId
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const mockedPurchaseProperties = {
      id: 'valid id',
      lastModified: new Date()
    };

    const decodeToken = jest.fn();
    decodeToken.mockReturnValue(mockedPurchaseProperties);

    const getSubscriptionAsync = jest.fn();
    getSubscriptionAsync.mockReturnValue(undefined);

    const addSubscriptionAsync = jest.fn();

    const services = {
      purchaseToken: {
        decodeToken
      },
      stateStore: {
        getSubscriptionAsync,
        addSubscriptionAsync
      },
      notifications: mockNotificationService()
    } as any as ServicesContainer;

    // Act
    //
    await resolveApi(req, res, services);

    // Assert
    //
    const expectedSubscription = generateSubscription(publisherId, mockedPurchaseProperties);

    expectResult(res, {
      id: expectedSubscription.id,
      offerId: expectedSubscription.offerId,
      planId: expectedSubscription.planId,
      subscriptionName: expectedSubscription.name,
      subscription: { ...expectedSubscription, ...mockedPurchaseProperties }
    });

    expect(addSubscriptionAsync.mock.calls.length === 1);
    expectStatus(res, 200);
  });

  test('When subscription does exist returns 200', async () => {
    // Arrange
    //
    const publisherId = 'publisher';

    const mockedGet = jest.fn();
    mockedGet.mockReturnValue('valid token');

    const req = {
      get: mockedGet,
      publisherId
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const mockedPurchaseProperties = {
      id: 'valid id',
      lastModified: new Date()
    };

    const decodeToken = jest.fn();
    decodeToken.mockReturnValue(mockedPurchaseProperties);

    const expectedSubscription = generateSubscription(publisherId, mockedPurchaseProperties);

    const getSubscriptionAsync = jest.fn();
    getSubscriptionAsync.mockReturnValue(expectedSubscription);

    const addSubscriptionAsync = jest.fn();

    const services = {
      purchaseToken: {
        decodeToken
      },
      stateStore: {
        getSubscriptionAsync,
        addSubscriptionAsync
      },
      notifications: mockNotificationService()
    } as any as ServicesContainer;

    // Act
    //
    await resolveApi(req, res, services);

    // Assert
    //
    expectResult(res, {
      id: expectedSubscription.id,
      offerId: expectedSubscription.offerId,
      planId: expectedSubscription.planId,
      subscriptionName: expectedSubscription.name,
      subscription: { ...expectedSubscription }
    });

    expect(addSubscriptionAsync.mock.calls.length === 0);
    expectStatus(res, 200);
  });
});
