import { Express, RequestHandler } from 'express';
import { ServicesContainer } from './services/container';
import * as impl from './webhook-api-impl';

// High-order function to inject ServiceContainer into api handlers
const configure: (app: Express, services: ServicesContainer) => void = (app, services) => {
  //
  // Change Plan / Quantity
  //
  app.patch('/api/webhook/subscription/:subscriptionId', (async (req, res) => {
    await impl.updateSubscriptionApi(req, res, services);
  }) as RequestHandler);

  //
  // Renew
  //
  app.post('/api/webhook/subscription/:subscriptionId/renew', (async (req, res) => {
    await impl.renewSubscriptionApi(req, res, services);
  }) as RequestHandler);

  //
  // Suspend
  //
  app.post('/api/webhook/subscription/:subscriptionId/suspend', (async (req, res) => {
    await impl.suspendSubscriptionApi(req, res, services);
  }) as RequestHandler);

  //
  // Unsubscribe
  //
  app.post('/api/webhook/subscription/:subscriptionId/unsubscribe', (async (req, res) => {
    await impl.unsubscribeSubscriptionApi(req, res, services);
  }) as RequestHandler);

  //
  // Reinstate
  //
  app.post('/api/webhook/subscription/:subscriptionId/reinstate', (async (req, res) => {
    await impl.reinstateSubscriptionApi(req, res, services);
  }) as RequestHandler);
};

export default configure;
