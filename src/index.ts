import * as path from 'path';
import * as dotenv from 'dotenv';
import express from 'express';
import configureSubscriptionApi from './subscription-api';
import configureOperationsApi from './operations-api';
import configureWebhookApi from './webhook-api';
import configureTestWebhook from './test-webhook-api';
import configureUtilApi from './utility-apis';
import { extractPublisher } from './extract-publisher';
import { createServicesContainer } from './services/container';
import { handleRequestIds } from './handle-requestids';
import { Config } from './types';
import { durationToMS } from './helpers/date-helper';
import { checkApiVersion } from './check-apiversion';
import { logObject } from './helpers/log-helper';

require('isomorphic-fetch');

// Read config from our .env file
const envFile = path.join(__dirname, '..', '.env');
dotenv.config({ path: envFile });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Setup express
const app = express();

// Configure CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

// Allow express to read json content
app.use(express.json());

const defaultPublisherId = 'FourthCoffee';
const publisherId = process.env.PUBLISHER_ID;
const publisherTenantId = process.env.PUBLISHER_TENANT_ID;
const publisherAppId = process.env.PUBLISHER_APP_ID;
const webhookResponse = parseInt(process.env.INTERNAL_WEBHOOK_RESPONSE as string);
const port = process.env.port ?? process.env.PORT ?? 3978;

//
// NB, the publisherId is not currently used. It was implemented to allow the validation of publisherID on activate
// This would require the publishedId to be saved on token creation before sending the user to the landing page
//
// If the publisherId has been set, then the publisherTenantId and publisherAppId should not be used
if (publisherId !== undefined && (publisherTenantId !== undefined || publisherAppId !== undefined)) {
  console.log(
    'Environment variable conflict. Either the PUBLISHER_ID should be set or PUBLISHER_TENANT_ID / PUBLISHER_APP_ID combination should be set, but not both.'
  );
  process.exitCode = 1;
} else {
  const config: Config = {
    webhookUrl: process.env.WEBHOOK_URL ?? `http://localhost:${port}/webhook`,
    landingPageUrl: process.env.LANDING_PAGE_URL ?? `http://localhost:${port}/landing.html`,
    operationTimeoutMS: durationToMS(process.env.OPERATION_TIMEOUT as string),
    subscriptionUpdateDelayMS: durationToMS(process.env.SUBSCRIPTION_UPDATE_DELAY as string),
    webhookCallDelayMS: durationToMS(process.env.WEBHOOK_CALL_DELAY as string),
    fileLocation: process.env.FILE_LOC ?? './config',
    requireAuth: (process.env.REQUIRE_AUTH ?? '').toLocaleLowerCase() === 'true',
    noSamples: (process.env.NO_SAMPLES ?? '').toLocaleLowerCase() === 'true',
    publisherId:
      publisherId ??
      (publisherTenantId !== undefined ? `${publisherTenantId}${publisherAppId as unknown as string}` : undefined) ??
      defaultPublisherId,

    run: {
      skipDataLoad: (process.env.SKIP_DATA_LOAD ?? '').toLocaleLowerCase() === 'true'
    },

    webhook: {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      tenantId: process.env.TENANT_ID
    },

    internal: {
      webhook: {
        response: Number.isNaN(webhookResponse) ? 200 : webhookResponse,
        operationPatchResult: process.env.INTERNAL_PATCH_RESULT,
        processDelayMS: durationToMS(process.env.INTERNAL_WEBHOOK_PROCESS_DELAY as string),
        callMarketplace: (process.env.INTERNAL_CALL_MARKETPLACE ?? '').toLocaleLowerCase() === 'true'
      }
    }
  };

  console.log('Config:');
  logObject(config, 1);

  // Create services container
  const servicesContainer = createServicesContainer(config);

  app.use(handleRequestIds(servicesContainer));

  // Inject middleware
  app.use('/api/saas/*', extractPublisher(servicesContainer), checkApiVersion());

  // Configure our APIs
  configureSubscriptionApi(app, servicesContainer);
  configureOperationsApi(app, servicesContainer);
  configureWebhookApi(app, servicesContainer);

  // Configure the test webhook implementation
  configureTestWebhook(app, servicesContainer);

  // Configure the utility apis
  configureUtilApi(app, servicesContainer);

  // Setup our static web content
  app.use('/', express.static(path.resolve('src', 'client')));

  
  // Start the server
  const server = app.listen(port, () => {
    console.log(`\nListening to ${port}`);
  });

  server.on('upgrade', (req, socket, head) => {
    servicesContainer.notifications.upgradeConnection(socket, req, head);
  })
}
