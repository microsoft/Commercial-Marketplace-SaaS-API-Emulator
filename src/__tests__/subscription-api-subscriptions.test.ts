import { getSubscriptionsApi } from '../subscription-api-impl';
import { expectResult, mockResponse, mockServicesContainerWithStateStore } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Subscriptions Api Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
  });

  test('When no subscriptions, returns empty list', async () => {
    // Arrange
    //
    const req = {
      publisherId: 'publisher'
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionsForPublisherAsync: undefined
    });

    // Act
    //
    await getSubscriptionsApi(req, res, services);

    // Assert
    //
    expectResult(res, { subscriptions: [] });
  });

  test('When has subscription entries, returns all as list', async () => {
    // Arrange
    //
    const req = {
      publisherId: 'publisher'
    } as any as RequestWithPublisher;

    const { res } = mockResponse();

    const subscriptions = [
      {
        id: 'test 1'
      },
      {
        id: 'test 2'
      }
    ];

    const { services } = mockServicesContainerWithStateStore({
      getSubscriptionsForPublisherAsync: subscriptions
    });

    // Act
    //
    await getSubscriptionsApi(req, res, services);

    // Assert
    //
    expectResult(res, { subscriptions });
  });
});
