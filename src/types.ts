import { Request } from 'express';

export interface StateStore {
  load: () => Promise<void>;
  save: () => Promise<void>;
  getPublishersAsync: () => Promise<Publishers>;
  addSubscriptionAsync: (publisherId: string, subscription: Subscription) => Promise<void>;
  updateSubscriptionAsync: (publisherId: string, subscription: Subscription) => Promise<boolean>;
  getSubscriptionsForPublisherAsync: (publisherId: string) => Promise<Subscription[] | undefined>;
  getSubscriptionAsync: (publisherId: string, subscriptionId: string) => Promise<Subscription | undefined>;
  findSubscriptionAsync: (subscriptionId: string) => Promise<Subscription | undefined>;
  addOperationAsync: (publisherId: string, subscriptionId: string, operation: Operation) => Promise<void>;
  getOperationsAsync: (publisherId: string, subscriptionId: string) => Promise<Operation[] | undefined>;
  getOperationAsync: (
    publisherId: string,
    subscriptionId: string,
    operationId: string
  ) => Promise<Operation | undefined>;
  getPlansForOfferAsync: (offerId: string) => Promise<Plan[] | undefined>;
}

export interface Config {
  webhookUrl: string | undefined;
  landingPageUrl: string | undefined;
  operationTimeoutMS: number | undefined;
  subscriptionUpdateDelayMS: number | undefined;
  webhookCallDelayMS: number | undefined;
  fileLocation: string | undefined;
  publisherId: string | undefined;

  run: {
    skipDataLoad: boolean | undefined;
  };

  internal: {
    webhook: {
      response: number | undefined;
      processDelayMS: number | undefined;
      operationPatchResult: string | undefined;
      clientId: string | undefined;
      clientSecret: string | undefined;
      tenantId: string | undefined;
      callMarketplace: boolean | undefined;
    };
  };
}

export type RequestWithPublisher = Request & {
  publisherId: string;
};

export type SetTimeoutHandler = () => void;

export const DataVersion = '1.0';

export type OperationAction = 'ChangePlan' | 'ChangeQuantity' | 'Reinstate' | 'Unsubscribe' | 'Renew' | 'Suspend';
export type OperationStatus = 'InProgress' | 'Succeeded' | 'Failed';

export interface Operation {
  id: string;
  operationRequestedSource: 'Partner' | 'Azure';
  activityId: string;
  subscriptionId: string;
  offerId: string;
  publisherId: string;
  planId: string;
  quantity?: number;
  action: OperationAction;
  timeStamp: Date;
  status: OperationStatus;
  errorStatusCode: string;
  errorMessage: string;
}

export type Publishers = Record<string, PublisherSubscriptions>;
export type PublisherSubscriptions = Record<string, SubscriptionAndOperations>;
export interface SubscriptionAndOperations {
  subscription: Subscription;
  operations: SubscriptionOperations;
}
export type SubscriptionOperations = Record<string, Operation>;

export type Offers = Record<string, Offer>;
export interface Offer {
  offerId: string;
  plans: PlanWrapper;
  persist: boolean;
}
export type PlanWrapper = Record<string, Plan>;

export interface Plan {
  planId: string;
  displayName: string;
  isPrivate: boolean;
  description: string;
  hasFreeTrials: boolean;
  isPricePerSeat: boolean;
  isStopSell: boolean;
  market: string;
  planComponents: {
    recurrentBillingTerms: [
      {
        currency: string;
        price: number;
        termUnit: string;
        termDescription: string;
        meteredQuantityIncluded?: [
          {
            dimensionId: string;
            units: string;
          }
        ];
      }
    ];
    meteringDimensions: [
      {
        id: string;
        currency: string;
        pricePerUnit: number;
        unitOfMeasure: string;
        displayName: string;
      }?
    ];
  };
}

export type WebhookPayload = Operation & {
  subscription?: Subscription;
  purchaseToken: null;
};

export type PurchaseProperties = Partial<Subscription> & { id: string };

// Special type used as the response to a call to resolve API - promotes some key properties
export interface ResolveResponse {
  id: string;
  subscriptionName: string;
  offerId: string;
  planId: string;
  quantity?: number;
  subscription: Subscription;
}

export interface Subscription {
  id: string;
  publisherId: string;
  offerId: string;
  name: string;
  saasSubscriptionStatus: 'PendingFulfillmentStart' | 'Subscribed' | 'Unsubscribed' | 'Suspended';
  beneficiary: {
    emailId: string;
    objectId: string;
    tenantId: string;
    puid: string;
  };
  purchaser: {
    emailId: string;
    objectId: string;
    tenantId: string;
    puid: string;
  };
  planId: string;
  term: {
    termUnit: string;
    startDate?: Date;
    endDate?: Date;
  };
  autoRenew: boolean;
  isTest: boolean;
  isFreeTrial: boolean;
  allowedCustomerOperations: string[];
  sandboxType: string;
  lastModified: Date;
  quantity?: number;
  sessionMode: string;
}

export interface ResolveTokenOverrides {
  subscriptionName: string;
  offerId: string;
  planId: string;
  quantity: number;
}

export interface ErrorResponse {
  message: string;
  target?: string;
  details?: ErrorResponse;
  code?: string;
}

export interface ApiVersionErrorResponse {
  Error: {
    Code: string;
    Message: string;
  };
}
