import { Request, Response, NextFunction } from 'express';
import { v4 as guid } from 'uuid';
import { ServicesContainer } from './services/container';

export const handleRequestIds = (services: ServicesContainer) => (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.get('x-ms-correlationid') ?? guid();
  const requestId = req.get('x-ms-requestid') ?? guid();

  res.setHeader('x-ms-correlationid', correlationId);
  res.setHeader('x-ms-requestid', requestId);

  services.context.setRequestId(requestId);

  next();
};
