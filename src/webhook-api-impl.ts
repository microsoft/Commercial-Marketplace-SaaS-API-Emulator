import { Request, Response } from 'express';
import { ServicesContainer } from './services/container';
import { Operation, OperationAction, OperationStatus, SetTimeoutHandler, Subscription, WebhookPayload } from './types';
import { v4 as guid } from 'uuid';
import { queueSubscriptionUpdate } from './helpers/queue-helper';
import { PlanAndQuantityValidationResult, validateNewPlanAndQuantity } from './helpers/subscription-helper';

require('isomorphic-fetch');

type ApiCall = (req: Request, res: Response, services: ServicesContainer) => Promise<any>;

function getOperationLocationUrl(req: Request, operation: Operation): string {
  let query = '';

  const apiVersion = req.get('api-version');
  if (apiVersion !== undefined) {
    query = `?api-version=${apiVersion}`;
  }

  return `${req.protocol}://${req.get('host') as string}/api/saas/subscriptions/${
    operation.subscriptionId
  }/operations/${operation.id}${query}`;
}

//
// Update plan / quantity
//
export const updateSubscriptionApi: ApiCall = async (req, res, services) => {
  await doWebhookOperationAsync(
    req,
    res,
    services,
    {
      validatePayload: async (subscription) => {
        const validationResult = await validateNewPlanAndQuantity(
          services,
          subscription,
          req.body?.planId,
          req.body?.quantity
        );

        let err: string | undefined;

        switch (validationResult) {
          case PlanAndQuantityValidationResult.NoPlanOrQuantitySpecified:
          case PlanAndQuantityValidationResult.InvalidQuantityValue:
          case PlanAndQuantityValidationResult.InvalidPlanIdValue:
            err = 'Invalid or missing planid or quantity';
            break;
          case PlanAndQuantityValidationResult.PlanAndQuantityInSingleOperation:
            err = 'Cannot patch more than one field in the same request';
            break;
          case PlanAndQuantityValidationResult.QuantityNoInValidRange:
            err =
              'This purchase has failed because the number of purchased seats exceeded the maximal limit of 1000000';
            break;
          case PlanAndQuantityValidationResult.PlanAlreadyOnSubscription:
            err = `SaaS subscription ${subscription.name} is already subscribed to plan ${
              req.body.planId as string
            }. Changing plans only supported between two different plans`;
            break;
          case PlanAndQuantityValidationResult.QuantityAlreadyOnSubscription:
            err = 'New quantity is the same as on the subscription';
            break;
          case PlanAndQuantityValidationResult.PlanNotInSubscribedOffer:
            err = 'Request Plan is NOT in Catalog.';
            break;
        }

        if (err !== undefined) {
          res.status(400).send(err);
          return false;
        }

        return true;
      },
      validateSubscription: (s) => s.saasSubscriptionStatus === 'Subscribed',
      modifyOperation: (o) => {
        if (req.body.planId !== undefined) {
          o.planId = req.body.planId;
        }
        if (req.body.quantity !== undefined) {
          o.quantity = req.body.quantity;
        }
      }
    },
    req.body.planId !== undefined ? 'ChangePlan' : 'ChangeQuantity'
  );
};

//
// Reinstate
//
export const reinstateSubscriptionApi: ApiCall = async (req, res, services) => {
  await doWebhookOperationAsync(
    req,
    res,
    services,
    {
      validateSubscription: (s) => s.saasSubscriptionStatus === 'Suspended'
    },
    'Reinstate'
  );
};

//
// Suspend
//
export const suspendSubscriptionApi: ApiCall = async (req, res, services) => {
  await doWebhookOperationAsync(
    req,
    res,
    services,
    {
      validateSubscription: (s) => s.saasSubscriptionStatus === 'Subscribed'
    },
    'Suspend'
  );
};

//
// Renew
//
export const renewSubscriptionApi: ApiCall = async (req, res, services) => {
  await doWebhookOperationAsync(
    req,
    res,
    services,
    {
      validateSubscription: (s) => s.saasSubscriptionStatus === 'Subscribed'
    },
    'Renew'
  );
};

//
// Unsubscribe
//
export const unsubscribeSubscriptionApi: ApiCall = async (req, res, services) => {
  await doWebhookOperationAsync(
    req,
    res,
    services,
    {
      validateSubscription: (s) => s.saasSubscriptionStatus === 'Subscribed' || s.saasSubscriptionStatus === 'Suspended'
    },
    'Unsubscribe'
  );
};

const isAckable: (operation: Operation) => boolean = (operation) => {
  switch (operation.action) {
    case 'ChangePlan':
    case 'ChangeQuantity':
      return true;
  }

  return false;
};

const doWebhookCallAsync: (
  operation: Operation,
  services: ServicesContainer,
  subscription: Subscription
) => Promise<string | undefined> = async (operation, services, subscription) => {
  let message: string | undefined;

  // Regardless of the webhook response, these
  // operations will always succeed
  if (!isAckable(operation)) {
    operation.status = 'Succeeded';
    await queueSubscriptionUpdate(services, operation);
  }

  // Call webhook
  const webhookSuccess = await callWebhook(operation, subscription, services);

  // Try to detect whether the webhook patched
  // the operation _before_ returning the status
  // This isn't perfect, but it checks as soon as
  // it can
  if (isAckable(operation) && operation.status !== 'InProgress') {
    services.logger.log('Sending emulator warning: Patch before return', 'Webhook API');
    message = 'Emulator warning - Detected attempt to patch the status of the operation before the request returned.';
    services.notifications.sendWarning("Detected attempt to patch the status of the operation before the request returned", subscription);
  }

  if (isAckable(operation)) {
    if (webhookSuccess === true) {
      // The webhook was successful... wait 10 seconds and then
      // try to update the status of the operation
      services.logger.log('Waiting 10 seconds for the webhook to patch', 'Webhook API');

      services.notifications.sendMessage("Waiting... [10s]");

      setTimeout(
        (async () => {
          if (operation.status !== 'InProgress') {
            services.logger.log('Operation patched by webhook', 'Webhook API');
            services.notifications.sendMessage("Operation was patched by webhook");
          } else {
            operation.status = 'Succeeded';
          }

          if (operation.status === 'Failed') {
            services.notifications.sendError("Operation " + operation.status);
          }
          else {
            services.notifications.sendMessage("Operation " + operation.status);
          }

          if (operation.status === 'Succeeded') {
            await queueSubscriptionUpdate(services, operation);
          }
        }) as SetTimeoutHandler,
        10000
      );
    } else {
      // The webhook wasn't called or returned an error...
      // Set the operation status to whatever the default value is
      // For this operation this will be "Failed", everything else
      // will have already succeeded
      operation.status = 'Failed';
    }
  }

  return message;
};

const doWebhookOperationAsync: (
  req: Request,
  res: Response,
  services: ServicesContainer,
  callbacks: {
    validatePayload?: (subscription: Subscription) => Promise<boolean | undefined>;
    validateSubscription?: (subscription: Subscription) => boolean | undefined;
    modifyOperation?: (operation: Operation) => void;
  },
  action: OperationAction
) => Promise<void> = async (req, res, services, callbacks, action) => {
  // Find the subscription without requiring the publisher id
  const subscription = await services.stateStore.findSubscriptionAsync(req.params.subscriptionId);

  if (subscription === undefined) {
    services.notifications.sendError("Cannot find subscription (Webhook not called)");
    res.status(404).send(`Unable to find subscription with id '${req.params.subscriptionId}'`);
    return;
  }

  // Validate the subscription based on the operation type
  if (callbacks.validateSubscription?.call(this, subscription) === false) {
    services.notifications.sendError("Subscription validation failed (Webhook not called)");
    return;
  }

  // Validate the payload
  if ((await callbacks.validatePayload?.call(this, subscription)) === false) {
    services.notifications.sendError("Payload validation failed (Webhook not called)");
    return;
  }

  const operation = createOperation(subscription, action, 'InProgress');

  services.logger.log(`Created operation: ${operation.id}`, 'Webhook API');

  // Allow the caller to update specific properties on the operation
  callbacks.modifyOperation?.call(this, operation);

  await services.stateStore.addOperationAsync(operation.publisherId, operation.subscriptionId, operation);

  setTimeout(
    (async () => {
      const message = await doWebhookCallAsync(operation, services, subscription);
      operation.errorMessage = message ?? '';
    }) as SetTimeoutHandler,
    services.config?.webhookCallDelayMS ?? 0
  );

  res.setHeader('Operation-Location', getOperationLocationUrl(req, operation));
  res.sendStatus(202);
};

const callWebhook: (
  operation: Operation,
  subscription: Subscription,
  services: ServicesContainer
) => Promise<boolean | undefined> = async (operation, subscription, services) => {
  const url = services.config.webhookUrl;

  if (url === undefined) {
    // NOTE: Check this behaviour
    // If the webhook url is unavailable (we aren't retrying right now)
    // the operation should be left to timeout
    return undefined;
  }

  // Try to get an access token using the passed config
  const accessToken = await services.tokens.getAccessToken(
    services.config.webhook.clientId, 
    services.config.webhook.clientSecret, 
    services.config.webhook.tenantId,
    services.config.webhook.clientId ?? "");

  const webhookPayload: WebhookPayload = {
    ...operation,
    subscription,
    purchaseToken: null
  };

  const authHeader: Record<string, string> = {};

  if (accessToken !== null) {
    authHeader.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(webhookPayload),
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      }
    });

    services.logger.log(`Webhook response ${response.status}`, 'Webhook API');

    if (response.ok) {
      services.notifications.sendMessage(`Webhook returned ${response.status}`);
      return true;
    }

    if (response.status >= 400 && response.status < 500) {
      services.notifications.sendError(`Webhook returned ${response.status}`);
      return false;
    }
  } catch (error: any) {
    services.notifications.sendError(`Error calling webhook ${JSON.stringify(error)}`);
    console.log("Unable to call webhook");
    console.log(error);
  }

  return undefined;
};

const createOperation: (subscription: Subscription, action: OperationAction, status: OperationStatus) => Operation = (
  subscription,
  action,
  status
) => {
  const ret: Operation = {
    action,
    errorMessage: '',
    activityId: guid(),
    errorStatusCode: '',
    id: guid(),
    offerId: subscription.offerId,
    operationRequestedSource: 'Azure',
    planId: subscription.planId,
    publisherId: subscription.publisherId,
    status,
    subscriptionId: subscription.id,
    timeStamp: new Date()
  };

  return ret;
};
