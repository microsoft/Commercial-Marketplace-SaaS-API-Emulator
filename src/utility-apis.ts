import { Express, RequestHandler } from 'express';
import { generateSampleSubscription } from './helpers/subscription-helper';
import { generateSampleOffer } from './helpers/offer-helper';
import { ServicesContainer } from './services/container';
import { Config, Offer } from './types';

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
  // Get all publishers
  //
  app.delete('/api/util/publishers/:pid/subscriptions/:sid', (async (req, res) => {
    const success = await services.stateStore.deleteSubscriptionAsync(req.params.pid, req.params.sid);
    res.sendStatus(success ? 204 : 404);
  }) as RequestHandler);

  //
  // Get sample offer
  //
  app.get('/api/util/offer', (async (req, res) => {
    const offer = generateSampleOffer('SampleOffer', 'Sample Offer', false, true);

    res.send(offer);
  }) as RequestHandler);

  //
  // Get all offers
  //
  app.get('/api/util/offers', (async (req, res) => {
    res.send(services.stateStore.getAllOffers());
  }) as RequestHandler);
  
  //
  // Get single offer
  //
  app.get('/api/util/offers/:offerId', (async (req, res) => {
    res.send(services.stateStore.getOffer(req.params.offerId));
  }) as RequestHandler);

  //
  // Upsert offer
  //
  app.post('/api/util/offers', (async (req, res) => {
    const offer = req.body as Partial<Offer>;
    const newOffer = await services.stateStore.upsertOfferAsync(offer);
    
    if (newOffer === undefined) {
      res.sendStatus(404);
    }
    else {
      res.send(newOffer);
    }

  }) as RequestHandler);

  //
  // Delete offer
  //
  app.delete('/api/util/offers/:offerId', (async (req, res) => {
    const success = await services.stateStore.deleteOfferAsync(req.params.offerId);
    res.sendStatus(success ? 204 : 400);
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
    delete config.internal;
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


  app.delete('/api/util/data-file', (async (req, res) => {
    await services.stateStore.clearState();
    res.sendStatus(204);
  }) as RequestHandler);
};

export default configure;
