import * as path from 'path';
import * as fs from 'fs/promises';
import {
  Subscription,
  Operation,
  Publishers,
  PublisherSubscriptions,
  SubscriptionAndOperations,
  Config,
  Offers,
  DataVersion,
  StateStore,
  Offer,
  Plan
} from '../types';
import { generateSampleOffer } from '../helpers/offer-helper';
import { Logger } from './logger';

export default class DefaultStateStore implements StateStore {
  publishers: Publishers = {};
  offers: Offers = {};
  config: Config;
  logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  private async checkDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!((await fs.stat(dir).catch((_) => false)) as boolean)) {
      await fs.mkdir(dir);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    await this.checkDir(filePath);
    return (await fs.stat(filePath).catch((_) => false)) as boolean;
  }

  private async loadOffers(fileLocation: string): Promise<void> {
    const offerFilePath = path.resolve(fileLocation, 'offers.json');

    if (!(await this.fileExists(offerFilePath))) {
      this.logger.log("Offers file doesn't exist - skipping offers load", 'StateStore');
      return;
    }

    const offerBuffer = await fs.readFile(offerFilePath, 'utf8');
    const offerData: Offers = JSON.parse(offerBuffer);

    try {
      const combinedOffers = { ...this.offers, ...offerData };
      this.offers = combinedOffers;
      this.logger.log('Custom offers loaded.', 'StateStore');
    } catch (error) {
      this.logger.log('Problem loading custom offers - check the JSON - skipping custom offers load', 'StateStore');
    }
  }

  async loadSubscriptions(fileLocation: string): Promise<void> {
    const filePath = path.resolve(fileLocation, 'data.json');

    if (!(await this.fileExists(filePath))) {
      this.logger.log("Data file doesn't exist - skipping data load", 'StateStore');
      return;
    }

    if (this.config.run.skipDataLoad === true) {
      this.logger.log('SKIP DATA LOAD == true - skipping data load', 'StateStore');
      return;
    }

    const buffer = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(buffer);

    if (data?.version !== DataVersion) {
      this.logger.log("Data version doesn't match - archiving file and skipping data load", 'StateStore');
      const archivedPath = path.resolve(
        path.dirname(filePath),
        `data_${(data.version as string) ?? 'missing_version'}.json`
      );
      try {
        await fs.copyFile(filePath, archivedPath);
        await fs.rm(filePath);
      } catch (e) {
        this.logger.log(`Unable to archive data file - ${e as string}`, 'StateStore');
      }
      return;
    }

    if (data?.publishers !== undefined) {
      this.publishers = data.publishers;
    } else {
      this.logger.log("Data file doesn't contain publishers - skipping data load for publishers", 'StateStore');
    }

    if (data?.offers !== undefined) {
      this.offers = { ...this.offers, ...data.offers };
    } else {
      this.logger.log("Data file doesn't contain offers - skipping data load for offers", 'StateStore');
    }
  }

  async load(): Promise<void> {
    // Always initialize some sample offers - they should not be persisted
    const sampleOffer1: Offer = generateSampleOffer('flat-rate', 'Sample Flat Rate', false, false);
    const sampleOffer2: Offer = generateSampleOffer('per-seat', 'Sample Per Seat', true, false);
    this.offers[sampleOffer1.offerId] = sampleOffer1;
    this.offers[sampleOffer2.offerId] = sampleOffer2;

    if (this.config.fileLocation === undefined) {
      this.logger.log('Missing file location from config - skipping data load', 'StateStore');
      return;
    }

    await this.loadOffers(this.config.fileLocation);
    await this.loadSubscriptions(this.config.fileLocation);
  }

  async save(): Promise<void> {
    const persistOffers: Offers = {};

    // Do not save offers marked as persist=false
    Object.values(this.offers).reduce<Offers>((_, obj) => {
      if (obj.persist) {
        persistOffers[obj.offerId] = obj;
      }
      return persistOffers;
    }, {});

    const data = JSON.stringify({
      version: DataVersion,
      publishers: this.publishers,
      offers: persistOffers
    });
    if (this.config.fileLocation === undefined) {
      this.logger.log('Missing file location from config - skipping data save', 'StateStore');
      return;
    }
    const filePath = path.resolve(this.config.fileLocation, 'data.json');
    await this.checkDir(filePath);

    try {
      await fs.writeFile(filePath, data, { encoding: 'utf8' });
    } catch (e) {
      this.logger.log(`Failed to save - ${e as string}`, 'StateStore');
    }
  }

  private getOrCreatePublisher(publisherId: string): PublisherSubscriptions {
    return this.publishers[publisherId] ?? (this.publishers[publisherId] = {});
  }

  private getPublisherSubscription(publisherId: string, subscriptionId: string): SubscriptionAndOperations | undefined {
    const publisherSubscriptions = this.publishers[publisherId];

    return publisherSubscriptions !== undefined ? publisherSubscriptions[subscriptionId] : undefined;
  }

  async getPublishersAsync(): Promise<Publishers> {
    return this.publishers;
  }

  async addSubscriptionAsync(publisherId: string, subscription: Subscription): Promise<void> {
    const publisherSubscriptions = this.getOrCreatePublisher(publisherId);

    publisherSubscriptions[subscription.id] = {
      subscription,
      operations: {}
    };

    await this.save();
  }

  async updateSubscriptionAsync(publisherId: string, subscription: Subscription): Promise<boolean> {
    const publisherSubscriptions = this.getOrCreatePublisher(publisherId);

    const publisherSubscription = publisherSubscriptions[subscription.id];

    if (publisherSubscription === undefined) {
      return false;
    }

    publisherSubscription.subscription = subscription;

    await this.save();

    return true;
  }

  async getSubscriptionsForPublisherAsync(publisherId: string): Promise<Subscription[] | undefined> {
    const publisherSubscriptions = this.publishers[publisherId];

    return publisherSubscriptions !== undefined
      ? Object.values(publisherSubscriptions).map((x) => x.subscription)
      : undefined;
  }

  async getSubscriptionAsync(publisherId: string, subscriptionId: string): Promise<Subscription | undefined> {
    return this.getPublisherSubscription(publisherId, subscriptionId)?.subscription;
  }

  async findSubscriptionAsync(subscriptionId: string): Promise<Subscription | undefined> {
    const subscription = Object.values(this.publishers).filter((x) =>
      Object.prototype.hasOwnProperty.call(x, subscriptionId)
    );
    return subscription.length > 0 ? subscription[0][subscriptionId].subscription : undefined;
  }

  async addOperationAsync(publisherId: string, subscriptionId: string, operation: Operation): Promise<void> {
    const operations = this.getPublisherSubscription(publisherId, subscriptionId)?.operations;

    if (operations !== undefined) {
      operations[operation.id] = operation;
    }

    await this.save();
  }

  async getOperationAsync(
    publisherId: string,
    subscriptionId: string,
    operationId: string
  ): Promise<Operation | undefined> {
    return this.getPublisherSubscription(publisherId, subscriptionId)?.operations[operationId];
  }

  async getOperationsAsync(publisherId: string, subscriptionId: string): Promise<Operation[] | undefined> {
    const operations = this.getPublisherSubscription(publisherId, subscriptionId)?.operations;

    return operations !== undefined ? Object.values(operations) : undefined;
  }

  async getPlansForOfferAsync(offerId: string, planId?: string): Promise<Plan[] | undefined> {

    const plans = this.offers[offerId]?.plans !== undefined ? Object.values(this.offers[offerId].plans) : undefined;

    if (planId === undefined || plans === undefined) {
      return plans;
    }

    return plans.filter(x => x.planId === planId);
  }

  async upsertOfferAsync(offer: Partial<Offer>) : Promise<boolean> {

    const newOffer : Offer = {
      displayName: "Sample Offer",
      offerId: "sampleOfferId",
      persist: false,
      plans: {},

      // Overwrite offer properties from request
      ...offer
    }

    // Check to see if any subscriptions associated with this offer still have their plans in tact
    for (const pub in this.publishers) {
      for (const sub in this.publishers[pub]) {
        const subscription = this.publishers[pub][sub];
        if (subscription.subscription.offerId === offer.offerId) {
          
          if (!Object.prototype.hasOwnProperty.call(offer.plans, subscription.subscription.planId)) {
            return false;
          }

        }
      }
    }

    this.offers[newOffer.offerId] = newOffer;
    await this.save();
    return true;
  }

  async deleteOfferAsync(offerId: string) : Promise<boolean> {
    if (!Object.prototype.hasOwnProperty.call(this.offers, offerId)) {
      return false;
    }

    // Check to see if the offer is associated with any subscriptions
    for (const pub in this.publishers) {
      for (const sub in this.publishers[pub]) {
        const subscription = this.publishers[pub][sub];
        if (subscription.subscription.offerId === offerId) {
          return false;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.offers[offerId];
    await this.save();
    return true;
  }

  getAllOffers() : Record<string, Offer> {
    return this.offers;
  }

  getOffer(offerId: string) : Offer | undefined {
    if (!Object.prototype.hasOwnProperty.call(this.offers, offerId)) {
      return undefined;
    }

    return this.offers[offerId];
  }
}
