import { ServicesContainer } from '../services/container';
import { Operation, OperationStatus, SetTimeoutHandler } from '../types';

export const queueOperationStatusUpdate = async (
  services: ServicesContainer,
  operation: Operation,
  status: OperationStatus
): Promise<void> => {
  const operationUpdateDelay = services.config?.operationTimeoutMS ?? 0;

  services.logger.log(`Updating operation in ${operationUpdateDelay}ms`, 'State Store');

  setTimeout(
    (async () => {
      services.logger.log(`Updating operation: ${operation.id}`, 'State Store');
      operation.status = status;
      if (status === 'Succeeded') {
        await queueSubscriptionUpdate(services, operation);
      }
    }) as SetTimeoutHandler,
    operationUpdateDelay
  );
};

export const queueSubscriptionUpdate = async (services: ServicesContainer, operation: Operation): Promise<void> => {
  if (operation.status !== 'Succeeded') {
    services.logger.log(`Attempted to update subscription with ${operation.status} operation`, 'State Store');
    return;
  }

  const subscription = await services.stateStore.getSubscriptionAsync(operation.publisherId, operation.subscriptionId);

  if (subscription === undefined) {
    return;
  }

  const subscriptionUpdateDelay = services.config?.subscriptionUpdateDelayMS ?? 0;

  services.logger.log(`Updating subscription in ${subscriptionUpdateDelay}ms`, 'State Store');

  setTimeout(
    (async () => {
      services.logger.log(`Updating subscription: ${subscription.id}`, 'State Store');

      if (subscription.saasSubscriptionStatus === 'Subscribed') {
        switch (operation.action) {
          case 'ChangePlan':
            subscription.planId = operation.planId;
            break;
          case 'ChangeQuantity':
            subscription.quantity = operation.quantity;
            break;
          case 'Unsubscribe':
            subscription.saasSubscriptionStatus = 'Unsubscribed';
            // When you unsubscribe from a per-user subscription
            // it seems to remove the quantity property from the subscription
            delete subscription.quantity;
            break;
          case 'Renew':
            // ?
            break;
          case 'Suspend':
            subscription.saasSubscriptionStatus = 'Suspended';
            break;
        }
      } else if (subscription.saasSubscriptionStatus === 'Suspended') {
        switch (operation.action) {
          case 'Unsubscribe':
            subscription.saasSubscriptionStatus = 'Unsubscribed';
            break;
          case 'Reinstate':
            subscription.saasSubscriptionStatus = 'Subscribed';
            break;
        }
      } else {
        // ERROR!
      }
      await services.stateStore.save();
    }) as SetTimeoutHandler,
    subscriptionUpdateDelay
  );
};
