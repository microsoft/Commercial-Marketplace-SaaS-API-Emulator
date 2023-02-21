# Microsoft Commercial Marketplace API Emulator

This repository contains a Node.js implementation of an emulator for the Microsoft commercial marketplace SaaS Fulfillment APIs.

To make hosting the emulator as simple as possible, the repo includes a Dockerfile for a building a containerised version.

## What challenges does this project address?

Integrating with the commercial marketplace has a few scaffolding requirements; a barrier to getting up and running quickly. The emulator breaks that dependency, allowing teams to start building for marketplace with zero friction. Specifically:

- Remove dependency on Partner Center
  - Partner Center onboarding and permissions can take some time to setup correctly. You can get started right away without waiting for this process.
  - Ordinarily, testing API flows against plans can only happen after they have been created in Partner Center. Emulated plans allow development to happen in parallel. Only final testing is required against Partner Center plans.
- Remove the AAD requirement
  - A SaaS transactable offer, or at least the integration with marketplace, must be built with AAD. The integration with the marketplace APIs requires the app to be registered in AAD and API calls are secured with OAuth2. Similarly, your landing page must support AAD SSO. The emulator removes these requirements to make it simpler (and quicker) to start implementing your integration flows.

## Design goals

- Keep things simple
- Implement the minimum required whilst being fully functional out of the box
- Be consistent with the **behaviour** of APIs, note differences from the documented behaviour
- Support both unauthenticated use for simplicity and authenticated use for closer fidelity with the marketplace APIs.
- Flexible implementation that offers multiple hosting options to suit the user
- Offer configuration options to tailor the behaviour
- Provide a UI to step through and visualise certain actions

## Getting started

The emulator is a Node.js application designed to be run as a Docker container for portability. Other hosting options are available.

### Hosting the emulator

There are many different ways to access the emulator.

1. Run the emulator locally as a Docker container
1. Host the emulator in Azure
1. Run & debug the emulator locally
1. Build and run the emulator locally

See [Getting up and running with the emulator](./docs/launching.md)

### Using the emulator

With the emulator running, you can connect to it using a browser and standard tools such as the [REST Client extension for VS Code](https://github.com/Huachao/vscode-restclient), [Postman](https://www.postman.com/) etc.

The URL and port will depend on [your chosen deployment method](./docs/launching.md). eg if you're running the emulator locally using `docker run`, you would likely connect on `http://localhost:8080`.

1. Run the emulator using your [chosen method](./docs/launching.md)
1. With a browser, connect to `http://<domain>:<port>` (domain, port depend on your run method)
   - You should be presented with a page for configuring a synthetic marketplace purchase token
1. Configure a purchase token
   1. (Optionally) configure properties on the purchase token (otherwise defaults will be populated)
   1. Click the `Generate Token` button
   1. Observe the generated JSON result
1. You can now either
   1. Use the emulator's simple, built-in landing page implementation to resolve & activate a subscription
   1. Exercise the APIs manually (eg using the VS Code REST client or Postman)

#### Use the Emulator's built-in landing page

1. Click on the `Post to landing page` button in the Token area
1. You will be taken to the emulator's built-in landing page
1. The purchase token is passed to the landing page as a query string parameter
1. When it loads, the landing page automatically calls the `resolve API` to decode the token
1. Key token properties are displayed on the page
1. Click the `Activate subscription` button to call the `activate API`
1. You should see a message indicating a `200 OK` status response
1. Navigate to the `Subscriptions` page to see your new subscription has been activated

#### Exercise the APIs manually

1. Click the `Copy to clipboard` button in the Token area (**not** the JSON result)
1. This copies the base64 encoded purchase token to the clipboard
1. Call the `resolve API` to resolve (decode) the purchase token
   1. This repo includes helpers to call the emulated APIs using the REST Client extension for VS Code
   1. Open this repo in VS Code
   1. Install the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
   1. Open [subscription-apis.http](rest_calls/subscription-apis.http) from the `\rest_calls` folder
   1. In `subscription-apis.http` set
      - `publisherId [string]` simulates the Publisher ID (can be anything you like eg Contoso Corp)
      - `baseUrl [sting]` format as above eg `http://localhost:8080`
      - `purchaseToken [string]` the base64 encoded purchase token (paste from the clipboard)
   1. Click `Send Request` (under ### Resolve)
      - You should see a Response appear with a `200 OK` status
      - The payload will include the decoded purchase token
1. Call the `activate API` to activate the purchase
   1. In `subscription-apis.http`
   1. Update the `planId` on the `activate` request to **match a valid planId** as set in the purchase token
   1. Click on `Send Request` on the `activate API` call
   1. You should see a `200 OK` status
   1. The payload will be `OK`

At this point you have

- Created a (synthetic) purchase token
- Resolved that purchase token to its properties
- Activated the purchase

You can now call other APIs to see their response

- eg the `GetSubscriptions` API would return a list of all subscriptions
- Having completed the above steps, this will return a collection with one item, the subscription you activated

There are helpers for all available SaaS Fulfillment v2 APIs in

- [subscription-apis.http](rest_calls/subscription-apis.http)
- [operations-apis.http](rest_calls/operations-apis.http)

For more details on the available APIs and their operation, see

- [SaaS subscription life cycle](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-life-cycle)
- [Subscription APIs](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api)
- [Operations APIs](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-operations-api)

## Functionality

The solution emulates all operations on the [SaaS Fulfillment APIs v2](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-life-cycle) closely. It is close-to, but not 100% fidelity (see [Limitations](#limitations) below.

Any solution should be [thoroughly tested against the marketplace APIs](https://learn.microsoft.com/azure/marketplace/test-saas-overview) before final release.

Capabilities include the following:

- Generate a synthetic [purchase identification token](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api#resolve-a-purchased-subscription)
- This token has customisable subscription properties that can be resolved by the emulated `resolve` API
- Publisher ID can be set by query string parameter (`publisherId`) or authorization header (bearer token)
- Testing the following flows:
  - Landing page flow
  - Activation flow
  - Update flow
  - Suspend and reinstate flow
  - Webhook flows

The format of the marketplace [purchase identification token](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api#resolve-a-purchased-subscription) is not documented. In the emulator, this has been simulated with a base64 encoded JSON payload.

## Limitations

- The activate call does not validate the publisher (as the 'faux' purchase token isn't associated with a specific publisher. This may be implemented in future.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [https://cla.opensource.microsoft.com](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
