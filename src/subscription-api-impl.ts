import { Response } from 'express';
import {
  generateSubscription,
  PlanAndQuantityValidationResult,
  validateNewPlanAndQuantity
} from './helpers/subscription-helper';
import { ServicesContainer } from './services/container';
import { RequestWithPublisher, ErrorResponse, Operation, ResolveResponse } from './types';
import { v4 as guid } from 'uuid';
import { queueOperationStatusUpdate } from './helpers/queue-helper';
import moment from 'moment';

type ApiCall = (req: RequestWithPublisher, res: Response, services: ServicesContainer) => Promise<any>;

function getOperationLocationUrl(req: RequestWithPublisher, operation: Operation): string {
  let query = '';

  const apiVersion = req.query['api-version'];
  if (apiVersion !== undefined) {
    query = `?api-version=${apiVersion as string}`;
  }

  return `${req.protocol}://${req.get('host') as string}/api/saas/subscriptions/${
    operation.subscriptionId
  }/operations/${operation.id}${query}`;
}

//
// Resolve
//
export const resolveApi: ApiCall = async (req, res, services) => {
  const token = req.get('x-ms-marketplace-token');

  // Check for the token
  if (token === undefined) {
    const err: ErrorResponse = {
      code: 'HeaderNotPresent',
      message: 'Mandatory header missing',
      target: 'x-ms-marketplace-token'
    };

    services.notifications.sendMessage("Marketplace token missing");

    return res.status(400).send(err);
  }

  // Try to decode the token
  const purchaseProperties = services.purchaseToken.decodeToken(token);

  // Just in case the purchase quantity comes in as a string,
  // we change it to an int
  if (purchaseProperties?.quantity !== undefined) {
    if (typeof purchaseProperties.quantity !== 'number') {
      purchaseProperties.quantity = parseInt(purchaseProperties.quantity);
    }
  }

  if (purchaseProperties === undefined) {
    const err: ErrorResponse = {
      code: 'InvalidValue',
      message: 'Failed to decode token',
      target: 'token'
    };

    services.notifications.sendError("Malformed marketplace token");

    return res.status(400).send(err);
  }

  // Make sure we have an id value
  if (purchaseProperties.id === undefined) {
    const err: ErrorResponse = {
      code: 'InvalidValue',
      message: 'Marketplace token requires an id',
      target: 'token'
    };

    services.notifications.sendError("Marketplace token contains no subscription id");

    return res.status(400).send(err);
  }

  // Try to get the subscription from the state store
  let subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, purchaseProperties.id);

  // If it wasn't there, then let's just add it now...
  if (subscription === undefined) {
    subscription = generateSubscription(req.publisherId, purchaseProperties);
    await services.stateStore.addSubscriptionAsync(req.publisherId, subscription);
  }

  // Create and return the response
  const response: ResolveResponse = {
    id: subscription.id,
    offerId: subscription.offerId,
    planId: subscription.planId,
    subscriptionName: subscription.name,
    subscription
  };

  if (subscription.quantity !== undefined) {
    response.quantity = subscription.quantity;
  }

  services.notifications.sendUpdate(subscription);

  res.status(200).send(response);
};

//
// Activate
//
export const activateApi: ApiCall = async (req, res, services) => {
  // Validate request body
  if (req.body.planId === undefined) {
    const err: ErrorResponse = {
      code: 'Bad Argument',
      message: 'One or more errors have occurred',
      target: 'activate',
      details: {
        code: 'RequiredField',
        message: 'The plan id is required',
        target: 'plan id'
      }
    };

    services.notifications.sendError("Plan id doesn't exist in body of request");

    return res.status(400).send(err);
  }

  const subscriptionId = req.params.subscriptionId;

  // Try to get the subscription from the state store
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, subscriptionId);

  if (subscription === undefined || subscription.saasSubscriptionStatus === 'Unsubscribed') {
    services.notifications.sendError("No subscription found, or unsubscribed");
    return res.sendStatus(404);
  }

  if (subscription.planId !== req.body.planId) {
    // Note: The documentation says that this call should return a 400 if the passed planId doesn't match the one purchased...
    // except, the real API doesn't seem to check this

    // Took a guess as the error here because the real api doesn't return an error for this
    const err: ErrorResponse = {
      code: 'Bad Argument',
      message: 'One or more errors have occurred',
      target: 'activate',
      details: {
        code: 'RequiredField',
        message: 'The plan id should match the purchased plan id',
        target: 'plan id'
      }
    };

    services.notifications.sendError("Plan id doesn't match the purchased plan id");

    return res.status(400).send(err);
  }

  // Update the term with a start and end date
  // TODO: Figure out the actual term unit and set the dates based on that

  const now = moment();
  const endMoment = now.add(subscription.term.termUnit);

  subscription.term.startDate = now.toDate();
  subscription.term.endDate = endMoment.toDate();
  subscription.saasSubscriptionStatus = 'Subscribed';

  // Update the subscription in the state store
  await services.stateStore.updateSubscriptionAsync(req.publisherId, subscription);

  services.notifications.sendUpdate(subscription);

  // No content in the response, but the api returns 200 rather than 204
  return res.sendStatus(200);
};

//
// Subscriptions
//
export const getSubscriptionsApi: ApiCall = async (req, res, services) => {
  const subscriptions = await services.stateStore.getSubscriptionsForPublisherAsync(req.publisherId);

  return res.send({ subscriptions: subscriptions ?? [] });
};

//
// Subscription Methods
//
export const getSubscriptionApi: ApiCall = async (req, res, services) => {
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  // No matching subscription found
  if (subscription === undefined) {
    const err: ErrorResponse = {
      code: 'EntityNotFound',
      message: `Subscription ${req.params.subscriptionId} not found`,
      target: 'subscriptionId'
    };

    return res.status(404).send(err);
  }

  return res.status(200).send(subscription);
};

export const updateSubscriptionApi: ApiCall = async (req, res, services) => {
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  // No matching subscription found
  if (subscription === undefined) {
    const err: ErrorResponse = {
      code: 'EntityNotFound',
      message: `Subscription ${req.params.subscriptionId} not found`,
      target: 'subscriptionId'
    };

    return res.status(404).send(err);
  }

  // Not subscribed
  if (subscription.saasSubscriptionStatus !== 'Subscribed') {
    const err: ErrorResponse = {
      code: 'BadRequest',
      message: 'Subscription is not active',
      target: 'update'
    };

    return res.status(400).send(err);
  }

  const validationResult = await validateNewPlanAndQuantity(
    services,
    subscription,
    req.body?.planId,
    req.body?.quantity
  );

  let err: ErrorResponse | undefined;

  switch (validationResult) {
    case PlanAndQuantityValidationResult.NoPlanOrQuantitySpecified:
    case PlanAndQuantityValidationResult.InvalidQuantityValue:
    case PlanAndQuantityValidationResult.InvalidPlanIdValue:
      err = {
        code: 'BadRequest',
        message: 'The request content is null',
        target: 'update'
      };
      break;
    case PlanAndQuantityValidationResult.PlanAndQuantityInSingleOperation:
      err = {
        message: 'Cannot patch more than one field in the same request'
      };
      break;
    case PlanAndQuantityValidationResult.QuantityNoInValidRange:
      err = {
        message: 'This purchase has failed because the number of purchased seats exceeded the maximal limit of 1000000'
      };
      break;
    case PlanAndQuantityValidationResult.PlanAlreadyOnSubscription:
      err = {
        message: `SaaS subscription ${subscription.name} is already subscribed to plan ${
          req.body.planId as string
        }. Changing plans only supported between two different plans`
      };
      break;
    case PlanAndQuantityValidationResult.QuantityAlreadyOnSubscription:
      err = {
        message: 'New quantity is the same as on the subscription'
      };
      break;
    case PlanAndQuantityValidationResult.PlanNotInSubscribedOffer:
      err = {
        code: 'BadRequest',
        message: 'Request Plan is NOT in Catalog.',
        target: 'update'
      };
      break;
  }

  if (err !== undefined) {
    return res.status(400).send(err);
  }

  // Check for pending operations
  const operations = (await services.stateStore.getOperationsAsync(req.publisherId, req.params.subscriptionId)) ?? [];

  if (operations.filter((x) => x.status === 'InProgress').length > 0) {
    const err: ErrorResponse = {
      code: 'Failed',
      message: 'Patch cannot be completed because the subscription is locked due to pending operations',
      target: 'update'
    };

    return res.status(400).send(err);
  }

  const operation: Operation = {
    id: guid(),
    activityId: guid(), // Not relevant
    operationRequestedSource: 'Partner',
    subscriptionId: subscription.id,
    offerId: subscription.offerId,
    publisherId: subscription.publisherId,
    planId: subscription.planId,
    action: 'ChangePlan',
    timeStamp: new Date(),
    status: 'InProgress',
    errorStatusCode: '',
    errorMessage: ''
  };

  if (req.body.planId !== undefined) {
    operation.action = 'ChangePlan';
    operation.planId = req.body.planId;
  }

  if (req.body.quantity !== undefined) {
    operation.action = 'ChangeQuantity';
    operation.quantity = req.body.quantity;
  }

  await services.stateStore.updateSubscriptionAsync(req.publisherId, subscription);

  await services.stateStore.addOperationAsync(req.publisherId, subscription.id, operation);

  // Operations from the API (i.e. those with operationRequestedSource = "Partner") will _always_ eventually succeed if it's got this far
  await queueOperationStatusUpdate(services, operation, 'Succeeded');

  res.setHeader('Operation-Location', getOperationLocationUrl(req, operation));
  res.setHeader('Operation-Id', operation.id);

  return res.sendStatus(202);
};

export const deleteSubscriptionApi: ApiCall = async (req, res, services) => {
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  // No matching subscription found
  if (subscription === undefined) {
    const err: ErrorResponse = {
      code: 'EntityNotFound',
      message: `Subscription ${req.params.subscriptionId} not found`,
      target: 'subscriptionId'
    };

    return res.status(404).send(err);
  }

  await services.stateStore.updateSubscriptionAsync(req.publisherId, subscription);

  const operation: Operation = {
    id: guid(),
    activityId: guid(), // Not relevant
    operationRequestedSource: 'Partner',
    subscriptionId: subscription.id,
    offerId: subscription.offerId,
    publisherId: subscription.publisherId,
    planId: subscription.planId,
    action: 'Unsubscribe',
    timeStamp: new Date(),
    status: 'Succeeded',
    errorStatusCode: '',
    errorMessage: ''
  };

  await services.stateStore.addOperationAsync(req.publisherId, subscription.id, operation);

  // Operations from the API (i.e. those with operationRequestedSource = "Partner") will _always_ eventually succeed if it's got this far
  await queueOperationStatusUpdate(services, operation, 'Succeeded');

  res.setHeader('Operation-Location', getOperationLocationUrl(req, operation));
  res.setHeader('Operation-Id', operation.id);

  return res.sendStatus(202);
};

//
// List available plans
//
export const listAvailablePlansApi: ApiCall = async (req, res, services) => {
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  if (subscription === undefined) {
    return res.send([]);
  }

  const plans = await services.stateStore.getPlansForOfferAsync(subscription.offerId, req.query.planId as string | undefined);

  return res.send({ plans: plans ?? [] });
};
