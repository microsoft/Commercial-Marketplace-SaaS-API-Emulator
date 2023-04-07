import { Offer, Plan, PlanWrapper } from '../types';

function generateSamplePlan(
  planId: string,
  displayName: string,
  description: string,
  isPricePerSeat: boolean
): Partial<Plan> {
  return {
    planId,
    displayName,
    description,
    isPricePerSeat
  };
}

function generatePlan(from: Partial<Plan>): Plan {
  return {
    planId: 'planId',
    displayName: 'displayName',
    isPrivate: false,
    description: 'description',
    hasFreeTrials: false,
    isPricePerSeat: false,
    isStopSell: false,
    market: 'GB',
    planComponents: {
      recurrentBillingTerms: [
        {
          currency: 'GBP',
          price: 50.0,
          termUnit: 'P1M',
          termDescription: '1 Month Subscription'
        }
      ],
      meteringDimensions: []
    },

    ...from
  };
}

export function generateSampleOffer(offerId: string, displayName: string, isPricePerSeat: boolean, persist: boolean): Offer {
  const plans: PlanWrapper = {
    [`${offerId}-1`]: generatePlan(generateSamplePlan(`${offerId}-1`, 'Bronze', 'Bronze Plan', isPricePerSeat)),
    [`${offerId}-2`]: generatePlan(generateSamplePlan(`${offerId}-2`, 'Silver', 'Silver Plan', isPricePerSeat)),
    [`${offerId}-3`]: generatePlan(generateSamplePlan(`${offerId}-3`, 'Gold', 'Gold Plan', isPricePerSeat))
  };

  return {
    offerId,
    plans,
    persist,
    displayName,
    publisher: "ForthCoffee"
  };
}
