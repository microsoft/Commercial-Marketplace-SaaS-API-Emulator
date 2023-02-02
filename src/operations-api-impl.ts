import { Response } from 'express';
import { queueOperationStatusUpdate } from './helpers/queue-helper';
import { ServicesContainer } from './services/container';
import { RequestWithPublisher, ErrorResponse } from './types';

type ApiCall = (req: RequestWithPublisher, res: Response, services: ServicesContainer) => Promise<any>;

//
// Get outstanding operations
//
// https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-operations-api#list-outstanding-operations
export const operationsApi: ApiCall = async (req, res, services) => {
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  // NOTE: (sp) The documentation says that if a subscription id isn't found it should return a 404
  // but it actually doesn't return an error at all. Just an empty operations list.
  // This has been implemented as the documentation suggests.
  if (subscription === undefined) {
    const response: ErrorResponse = {
      message: `Subscription ${req.params.subscriptionId} not found`,
      target: 'subscriptionId',
      code: 'EntityNotFound'
    };

    return res.status(404).send(response);
  }

  // NOTE: (sp) There seems to be a delay before in progress operations appear in this list
  // I assume there is some eventually consistent read cache...
  // We could simulate this with something like looking for operations older than x

  // We've already checked the subscription so if nothing comes back from this we can safely coalesce with an empty array
  const operations = (await services.stateStore.getOperationsAsync(req.publisherId, req.params.subscriptionId)) ?? [];

  return res.status(200).send(operations.filter((x) => x.status === 'InProgress'));
};

//
// Get operation status
//
// https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-operations-api#get-operation-status
export const operationApi: ApiCall = async (req, res, services) => {
  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  // NOTE: (sp) The documentation says that if a subscription id isn't found it should return a 404
  // but it actually returns 400.
  // This has been implemented as the documentation suggests.
  if (subscription === undefined) {
    const response: ErrorResponse = {
      message: `Subscription ${req.params.subscriptionId} not found`,
      target: 'subscriptionId',
      code: 'EntityNotFound'
    };

    return res.status(404).send(response);
  }

  const operation = await services.stateStore.getOperationAsync(
    req.publisherId,
    req.params.subscriptionId,
    req.params.operationId
  );

  if (operation === undefined) {
    // NOTE: (sp) The documentation says that this should return a 404 if the operation isn't found
    // but it actually returns 400
    // This has been implemented as the documentation suggests.

    const response: ErrorResponse = {
      message: 'Failed to get operation',
      target: req.params.operationId,
      code: 'EntityNotFound'
    };

    return res.status(404).send(response);
  }

  return res.status(200).send(operation);
};

//
// Update operation status
//
// https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-operations-api#update-the-status-of-an-operation
export const updateOperationApi: ApiCall = async (req, res, services) => {
  const newStatus = req.body?.status;

  // NOTE: We would expect the API to validate the payload, but it doesn't - in testing, you can send "blah" and it returns 200 OK
  // == API SHOULD DO THIS ==
  if (newStatus === undefined || (newStatus !== 'Success' && newStatus !== 'Failure')) {
    const response: ErrorResponse = {
      message: 'Expected Success or Failure',
      target: 'status',
      code: 'InvalidValue'
    };

    return res.status(400).send(response);
  }
  // == API SHOULD DO THIS ==

  const subscription = await services.stateStore.getSubscriptionAsync(req.publisherId, req.params.subscriptionId);

  // NOTE: (sp) The documentation says that if a subscription id isn't found it should return a 404
  // but it actually returns 400 and the error relates to not finding the operation (even if the operation id _is_ valid).
  // This has been implemented as the documentation suggests.
  if (subscription === undefined) {
    const response: ErrorResponse = {
      message: 'Failed to find operation',
      target: 'operation',
      code: 'NotFound'
    };

    return res.status(404).send(response);
  }

  const operation = await services.stateStore.getOperationAsync(
    req.publisherId,
    req.params.subscriptionId,
    req.params.operationId
  );

  // NOTE: (sp) The documentation says that if a operation id isn't found it should return a 404
  // but it actually returns 400.
  // This has been implemented as the documentation suggests.
  if (operation === undefined) {
    const response: ErrorResponse = {
      message: 'Failed to find operation',
      target: 'operation',
      code: 'NotFound'
    };

    return res.status(404).send(response);
  }

  // NOTE: (sp) Strange behavior... if you try to update the status of an operation that was created from the API it returns 500
  // I assume this is because they will _always_ eventually succeed?
  // TODO: Need to make a call on whether this should behave as the API or... something else?
  if (operation.operationRequestedSource === 'Partner') {
    return res
      .status(500)
      .send("This is emulated behavior. If an operation has a requested source of 'Partner' the API returns 500.");
  }

  // NOTE: (sp) Can we "fail" a request to unsubscribe? I'm guessing not but this needs testing

  // == API SHOULD DO THIS ==
  if (operation.action === 'Renew' || operation.action === 'Suspend' || operation.action === 'Unsubscribe') {
    return res.status(400).send({
      message: "Cannot update the status of an operation that doesn't require an ACK",
      target: 'operation',
      code: 'Error'
    });
  }
  // == API SHOULD DO THIS ==

  // NOTE: (sp) 409 if a newer update is already fulfilled
  // The assumption here is that this only applies to the current operation
  // i.e. you can always add a second operation (even of the same type) while
  // the first is in progress - I did test this, but I can't say for sure
  // how accurate that assumption is.
  if (operation.status !== 'InProgress') {
    const response: ErrorResponse = {
      // NOTE: Oddly, the error body contains the request id??
      message: req.get('x-ms-requestid') as string
    };

    return res.status(409).send(response);
  }

  await queueOperationStatusUpdate(services, operation, newStatus === 'Success' ? 'Succeeded' : 'Failed');

  return res.sendStatus(200);
};
