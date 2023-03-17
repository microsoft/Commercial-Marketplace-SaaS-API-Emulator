import { Express, Request, RequestHandler } from 'express';
import { ServicesContainer } from './services/container';
import { SetTimeoutHandler } from './types';

const Configure = (app: Express, services: ServicesContainer): void => {
  const _config = services.config.internal.webhook;
  const clientConfig = services.config.webhook;
  const logger = services.logger;

  const processWebhookAsync: (req: Request) => Promise<void> = async (req) => {
    logger.log('Running webhook', 'Webhook');

    if (req.body?.subscription === undefined || req.body?.id === undefined) {
      logger.log('No subscription or operation id in body', 'Webhook');
      return;
    }

    if (_config.operationPatchResult === undefined) {
      logger.log('No patch result configured, skipping patch!', 'Webhook');
      return;
    }

    if (!(clientConfig.clientId !== undefined && clientConfig.clientSecret !== undefined && clientConfig.tenantId !== undefined)) {
      logger.log('No app parameters configured, skipping patch!', 'Webhook');
      return;
    }

    const token = await services.tokens.getAccessToken(clientConfig.clientId, clientConfig.clientSecret, clientConfig.tenantId, false, "20e940b3-4c77-4b0b-9a53-9e16a1b010a7");

    if (token === null) {
      services.logger.log("Cannot get an access token");
      return;
    }

    const baseUri =
      _config.callMarketplace === true
        ? 'https://marketplaceapi.microsoft.com'
        : `${req.protocol}://${req.get('host') as string}`;

    const patchRequest = _config.operationPatchResult ?? 'Success';

    logger.log(`Patching with '${patchRequest}'`, 'Webhook');

    const response = await fetch(
      `${baseUri}/api/saas/subscriptions/${req.body.subscriptionId as string}/operations/${
        req.body.id as string
      }?api-version=2018-08-31`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: patchRequest }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    logger.log(`Patch response: ${response.status}`, 'Webhook');
  };

  app.post('/webhook', (async (req, res) => {
    logger.log(`Waiting for ${_config.processDelayMS ?? '0'}ms...`, 'Webhook');

    const processDelay = _config.processDelayMS ?? 0;

    if (processDelay === 0) {
      await processWebhookAsync(req);
    } else {
      setTimeout(
        (async () => {
          await processWebhookAsync(req);
        }) as SetTimeoutHandler,
        processDelay
      );
    }

    const statusCode = _config.response ?? 200;
    logger.log(`Returning ${statusCode}`, 'Webhook');
    return res.sendStatus(statusCode);
  }) as RequestHandler);
};

export default Configure;
