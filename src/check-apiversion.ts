import { Request, Response, NextFunction } from 'express';
import { ApiVersionErrorResponse } from './types';

export const checkApiVersion = () => (req: Request, res: Response, next: NextFunction) => {
  if (req.query['api-version'] === undefined) {
    const err: ApiVersionErrorResponse = {
      Error: {
        Code: 'ApiVersionUnspecified',
        Message: 'An API version is required, but was not specified.'
      }
    };

    res.status(400).send(err);
    return;
  }

  if (req.query['api-version'] !== '2018-08-31') {
    const reqUrl = `${req.protocol}://${req.get('host') as string}${req.originalUrl}`;

    const err: ApiVersionErrorResponse = {
      Error: {
        Code: 'UnsupportedApiVersion',
        Message: `The HTTP resource that matches the request URI '${reqUrl}' does not support the API version '2018-08-31.1'.`
      }
    };

    res.status(400).send(err);
    return;
  }

  next();
};
