import { Express, RequestHandler } from 'express';
import { ServicesContainer } from './services/container';
import * as impl from './operations-api-impl';
import { RequestWithPublisher } from './types';
import { checkToken } from './check-token';

// High-order function to inject ServiceContainer into api handlers
const configure: (app: Express, services: ServicesContainer) => void = (app, services) => {
  //
  // Get outstanding operations
  //
  app.get('/api/saas/subscriptions/:subscriptionId/operations', checkToken(services), (async (req, res) => {
    await impl.operationsApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  //
  // Get operation status
  //
  app.get('/api/saas/subscriptions/:subscriptionId/operations/:operationId', checkToken(services), (async (req, res) => {
    await impl.operationApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  //
  // Subscriptions
  //
  app.patch('/api/saas/subscriptions/:subscriptionId/operations/:operationId', checkToken(services), (async (req, res) => {
    await impl.updateOperationApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);
};

export default configure;
