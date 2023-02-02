import { Request } from 'express';
import { checkApiVersion } from '../check-apiversion';
import { expectResult, expectStatus, mockResponse } from '../testHelpers/helpers';

describe('Check API Version tests', () => {
  test('When no api-version query param, returns 400', () => {
    // Arrange
    //
    const protocol = 'http';
    const host = 'localhost';
    const originalUrl = '/webhook';
    const mockedGet = jest.fn();
    mockedGet.mockReturnValue(host);

    const req = {
      headers: {},
      protocol,
      originalUrl,
      query: {},
      get: mockedGet
    } as any as Request;

    const { res, send } = mockResponse();

    const next = jest.fn();

    const result = {
      Error: {
        Code: 'ApiVersionUnspecified',
        Message: 'An API version is required, but was not specified.'
      }
    };

    // Act
    //
    const middleware = checkApiVersion();
    middleware(req, res, next);

    // Assert
    //
    expectStatus(res, 400);
    expectResult(res, result);
    expect(send).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('When invalid api-version query param, returns 400', () => {
    // Arrange
    //
    const protocol = 'http';
    const host = 'localhost';
    const originalUrl = '/webhook';
    const mockedGet = jest.fn();
    mockedGet.mockReturnValue(host);

    const req = {
      headers: {},
      protocol,
      originalUrl,
      query: {},
      get: mockedGet
    } as any as Request;

    req.query['api-version'] = 'abc';

    const { res, send } = mockResponse();

    const next = jest.fn();

    const result = {
      Error: {
        Code: 'UnsupportedApiVersion',
        Message: `The HTTP resource that matches the request URI '${protocol}://${host}${originalUrl}' does not support the API version '2018-08-31.1'.`
      }
    };

    // Act
    //
    const middleware = checkApiVersion();
    middleware(req, res, next);

    // Assert
    //
    expectStatus(res, 400);
    expectResult(res, result);
    expect(send).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(0);
  });

  test('When API version is correct, return 200', () => {
    // Arrange
    //
    const mockedGet = jest.fn();
    mockedGet.mockReturnValue('localhost');

    const req = {
      headers: {},
      protocol: 'http',
      originalUrl: '/webhook',
      query: {},
      get: mockedGet
    } as any as Request;

    req.query['api-version'] = '2018-08-31';

    const { res, send } = mockResponse();

    const next = jest.fn();

    // Act
    //
    const middleware = checkApiVersion();
    middleware(req, res, next);

    // Assert
    //
    expect(send).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
