import { Express, RequestHandler } from 'express';
import { generateSampleSubscription } from './helpers/subscription-helper';
import { generateSampleOffer } from './helpers/offer-helper';
import { ServicesContainer } from './services/container';
import { Config } from './types';

// High-order function to inject ServiceContainer into api handlers
const configure: (app: Express, services: ServicesContainer) => void = (app, services) => {
  //
  // Get sample subscription
  //
  app.get('/api/util/subscription', (async (req, res) => {
    const subscription = generateSampleSubscription();

    res.send(subscription);
  }) as RequestHandler);

  //
  // Get all publishers
  //
  app.get('/api/util/publishers/:pid/subscriptions/:sid', (async (req, res) => {
    const publishers = await services.stateStore.getSubscriptionAsync(req.params.pid, req.params.sid);

    res.send(publishers);
  }) as RequestHandler);

  //
  // Get sample offer
  //
  app.get('/api/util/offer', (async (req, res) => {
    const offer = generateSampleOffer('SampleOffer', false, true);

    res.send(offer);
  }) as RequestHandler);

  //
  // Get all publishers
  //
  app.get('/api/util/publishers', (async (req, res) => {
    const publishers = await services.stateStore.getPublishersAsync();

    res.send(publishers);
  }) as RequestHandler);

  //
  // Get config
  //
  app.get('/api/util/config', (async (req, res) => {
    const config = JSON.parse(JSON.stringify(services.config)) as Config;
    delete config.webhook.clientSecret;
    res.status(200).send(config);
  }) as RequestHandler);

  //
  // Update config
  //
  app.patch('/api/util/config', (async (req, res) => {
    for (const i in req.body) {
      if (Object.prototype.hasOwnProperty.call(services.config, i)) {
        // If it's the webhookUrl/landingPageUrl being set, a relative path wont work
        if (i === 'webhookUrl' || i === 'landingPageUrl') {
          const url = req.body[i] as string;
          if (!url.startsWith('http')) {
            res.status(400).send('URLs must be a fully qualified.');
            return;
          }
        }

        if (i === "requireAuth") {
          (services.config as any)[i] = req.body[i] === "true";
        }
        else {
          (services.config as any)[i] = req.body[i];
        }
      }
    }
    res.sendStatus(200);
  }) as RequestHandler);
};

export default configure;
