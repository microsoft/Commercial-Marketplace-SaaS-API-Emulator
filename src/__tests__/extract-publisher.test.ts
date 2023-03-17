import { Request } from 'express';
import { extractPublisher } from '../extract-publisher';
import { ServicesContainer } from '../services/container';
import { expectStatus, mockResponse } from '../testHelpers/helpers';
import { RequestWithPublisher } from '../types';

describe('Extract publisher tests', () => {
  it.each([
    [undefined, undefined, undefined, undefined],
    [undefined, 'malformed bearer token', 'tid value', 'appid value'],
    [undefined, 'bearer', 'tid value', 'appid value']
  ])(
    'Returns 401',
    (
      publisherId: string | undefined,
      bearerToken: string | undefined,
      bearerTidClaim: string | undefined,
      bearerAppIdClaim: string | undefined
    ) => {
      // Arrange
      //
      const req: Partial<Request> = {
        headers: {
          authorization: bearerToken
        },
        query: {
          publisherId
        }
      };

      const decodedToken = {
        tid: bearerTidClaim,
        appid: bearerAppIdClaim
      };

      const decodeToken = jest.fn().mockReturnValue(decodedToken);
      const verifyToken = jest.fn().mockReturnValue(Promise.resolve({isValid: true, reason: null}));

      const services: Partial<ServicesContainer> = {
        jwt: {
          decodeToken,
          verifyToken
        }
      };

      const { res, send } = mockResponse();

      const next = jest.fn();

      // Act
      //
      const middleware = extractPublisher(services as ServicesContainer);
      middleware(req as Request, res, next);

      // Assert
      //
      expectStatus(res, 401);
      expect(send).toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(0);
    }
  );

  it.each([
    [undefined, 'bearer goodToken', 'tid', 'appid', 'tidappid'], // Check that we concat the tid and appid claims
    ['goodPublisherId', undefined, undefined, undefined, 'goodPublisherId'], // Check that we just pass through the publisherId query value
    ['goodPublisherId', 'bearer goodToken', 'tid', 'appid', 'tidappid'] // Check that a bearer token overrides the publisherId query value
  ])(
    'Calls next middleware',
    (
      publisherId: string | undefined,
      bearerToken: string | undefined,
      bearerTidClaim: string | undefined,
      bearerAppIdClaim: string | undefined,
      expectedPublisherId: string
    ) => {
      // Arrange
      //

      const req: Partial<RequestWithPublisher> = {
        headers: {
          authorization: bearerToken
        },
        query: {
          publisherId
        }
      };

      const decodedToken = {
        tid: bearerTidClaim,
        appid: bearerAppIdClaim
      };

      const decodeToken = jest.fn().mockReturnValue(decodedToken);
      const verifyToken = jest.fn().mockReturnValue(Promise.resolve({isValid: true, reason: null}));

      const services: Partial<ServicesContainer> = {
        jwt: {
          decodeToken,
          verifyToken
        }
      };

      const { res, send } = mockResponse();

      const next = jest.fn();

      // Act
      //
      const middleware = extractPublisher(services as ServicesContainer);
      middleware(req as Request, res, next);

      // Assert
      //
      expect(send).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);

      expect(req.publisherId).toBe(expectedPublisherId);
    }
  );
});
