import { ServicesContainer } from '../services/container';
import { PurchaseProperties, Subscription } from '../types';

export const generateSampleSubscription: () => Partial<Subscription> = () => {
  return {
    id: 'guid',
    offerId: 'string',
    planId: 'string',
    name: 'string',
    beneficiary: {
      emailId: 'email',
      objectId: 'oid',
      tenantId: 'tid',
      puid: ''
    },
    purchaser: {
      emailId: 'email',
      objectId: 'oid',
      tenantId: 'tid',
      puid: ''
    },
    quantity: 1,
    autoRenew: true,
    isTest: true,
    isFreeTrial: true
  };
};

export const generateSubscription: (publisherId: string, from: PurchaseProperties) => Subscription = (
  publisherId,
  from
) => {
  return {
    publisherId,
    offerId: 'flat-rate',
    name: 'Contoso Cloud Solution',
    saasSubscriptionStatus: 'PendingFulfillmentStart',
    beneficiary: {
      emailId: 'test@test.com',
      objectId: 'cbb6d5aa-4887-444f-ac9e-b56f8f6e66c2',
      tenantId: '2694e9dc-29a5-4017-958d-68314a91f2d2',
      puid: '78307556-1eba-41d9-b07a-b7f0c78c2c12'
    },
    purchaser: {
      emailId: 'test@test.com',
      objectId: 'cbb6d5aa-4887-444f-ac9e-b56f8f6e66c2',
      tenantId: '2694e9dc-29a5-4017-958d-68314a91f2d2',
      puid: '78307556-1eba-41d9-b07a-b7f0c78c2c12'
    },
    planId: 'flat-rate-1',
    term: {
      termUnit: 'P1M'
    },
    autoRenew: true,
    isTest: true,
    isFreeTrial: false,
    allowedCustomerOperations: ['Read', 'Delete', 'Update'],
    sandboxType: 'None',
    lastModified: new Date(),
    sessionMode: 'None',

    ...from // Override any values in the "from" subscription object
  };
};

export enum PlanAndQuantityValidationResult {
  NoPlanOrQuantitySpecified,
  PlanAndQuantityInSingleOperation,
  InvalidPlanIdValue,
  InvalidQuantityValue,
  PlanAlreadyOnSubscription,
  PlanNotInSubscribedOffer,
  QuantityNoInValidRange,
  QuantityNotValidForPlan,
  QuantityAlreadyOnSubscription,
  Success
}

export const validateNewPlanAndQuantity: (
  services: ServicesContainer,
  subscription: Subscription,
  newPlan: string | undefined,
  newQuantity?: number | undefined
) => Promise<PlanAndQuantityValidationResult> = async (services, subscription, newPlan, newQuantity) => {
  if (newPlan === undefined && newQuantity === undefined) {
    return PlanAndQuantityValidationResult.NoPlanOrQuantitySpecified;
  }

  if (newPlan !== undefined && newQuantity !== undefined) {
    return PlanAndQuantityValidationResult.PlanAndQuantityInSingleOperation;
  }

  if (newPlan !== undefined) {
    return await validateNewPlan(services, subscription, newPlan);
  }

  return await validateNewQuantity(services, subscription, newQuantity as number);
};

const validateNewPlan: (
  services: ServicesContainer,
  subscription: Subscription,
  newPlan: string
) => Promise<PlanAndQuantityValidationResult> = async (services, subscription, newPlan) => {
  newPlan = newPlan.trim();

  // Is the new plan a valid value?
  if (newPlan === '') {
    return PlanAndQuantityValidationResult.InvalidPlanIdValue;
  }

  // Is the new plan already associated with the subscription?
  if (newPlan === subscription.planId) {
    return PlanAndQuantityValidationResult.PlanAlreadyOnSubscription;
  }

  // Does the new plan exist in the offer associated with the subscription?
  const plans = await services.stateStore.getPlansForOfferAsync(subscription.offerId);
  if (plans?.find((x) => x.planId === newPlan) === undefined) {
    return PlanAndQuantityValidationResult.PlanNotInSubscribedOffer;
  }

  // TODO: Does the new plan allow the existing quantity?

  return PlanAndQuantityValidationResult.Success;
};

const validateNewQuantity: (
  services: ServicesContainer,
  subscription: Subscription,
  newQuantity: number
) => Promise<PlanAndQuantityValidationResult> = async (services, subscription, newQuantity) => {
  // Is the new quantity a valid value?
  if (isNaN(newQuantity) || newQuantity <= 0) {
    return PlanAndQuantityValidationResult.InvalidQuantityValue;
  }

  // Is the quantity in the allowed range?
  if (newQuantity >= 10000000) {
    return PlanAndQuantityValidationResult.QuantityNoInValidRange;
  }

  // Is the new quantity the same as the current quantity
  if (newQuantity === subscription.quantity) {
    return PlanAndQuantityValidationResult.QuantityAlreadyOnSubscription;
  }

  // TODO: Is the quantity allowed based on the current plan?

  return PlanAndQuantityValidationResult.Success;
};
