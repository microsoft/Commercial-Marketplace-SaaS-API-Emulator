import { Express, RequestHandler } from 'express';
import { ServicesContainer } from './services/container';
import * as impl from './subscription-api-impl';
import { RequestWithPublisher } from './types';

// High-order function to inject ServiceContainer into api handlers
const configure: (app: Express, services: ServicesContainer) => void = (app, services) => {
  //
  // Resolve
  //
  app.post('/api/saas/subscriptions/resolve', (async (req, res) => {
    await impl.resolveApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  //
  // Activate
  //
  app.post('/api/saas/subscriptions/:subscriptionId/activate', (async (req, res) => {
    await impl.activateApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  //
  // Subscriptions
  //
  app.get('/api/saas/subscriptions', (async (req, res) => {
    await impl.getSubscriptionsApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  //
  // Subscription Methods
  //
  app.get('/api/saas/subscriptions/:subscriptionId', (async (req, res) => {
    await impl.getSubscriptionApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  app.patch('/api/saas/subscriptions/:subscriptionId', (async (req, res) => {
    await impl.updateSubscriptionApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  app.delete('/api/saas/subscriptions/:subscriptionId', (async (req, res) => {
    await impl.deleteSubscriptionApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);

  //
  // List available plans
  //
  app.get('/api/saas/subscriptions/:subscriptionId/listAvailablePlans', (async (req, res) => {
    await impl.listAvailablePlansApi(req as RequestWithPublisher, res, services);
  }) as RequestHandler);
};

export default configure;
