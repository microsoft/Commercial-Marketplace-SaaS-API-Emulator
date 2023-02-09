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

1. Run the emulator locally as a Docker container (build image yourself - requires Docker)
1. Host the emulator in Azure (no Docker required, there is a hosting cost)
1. Run & debug the emulator (eg in VSCode)
1. Build and run the emulator locally (Node.js required)

See [Running the emulator](#running-the-emulator) (below)

### Using the emulator

With the emulator running, you can connect to it using a browser and standard tools such as the [REST Client extension for VSCode](https://github.com/Huachao/vscode-restclient), [Postman](https://www.postman.com/) etc. The URL and port will depend chosen deployment method ([see below](#running-the-emulator)). eg if you're running the emulator locally using `docker run`, you would likely connect on `http://localhost:8080`.

1. Run the emulator using your [chosen method](#running-the-emulator)
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

## Building the image

You can easily build the Docker image yourself:

- Clone this repo
- cd into the repo folder
- To build the Docker image run:
  ```
  docker build -t marketplaceapiemulator -f docker/Dockerfile .
  ```
- You will now have a Docker image tagged `marketplaceapiemulator`

## Configuration

There are a number of configuration options that can be set on the emulator.

- Common Options

  - PORT (number)
    - The local port on which the emulator listens
    - `Default: 3978 (debugger) / 80 (Docker)`
  - WEBHOOK_URL (URL)
    - The URL of your webhook service (by default, set to the emulator built-in implementation)
    - `Default: http://localhost:[PORT]/webhook`
  - LANDING_PAGE_URL (URL)
    - The URL of your landing page (by default, set to the emulator built-in implementation)
    - `Default: http://localhost:[PORT]/landing.html`
  - SKIP_DATA_LOAD (boolean)
    - Tell the emulator not to load any existing data file on startup. This value is only used during startup. Useful for debugging.
    - `Default: false`

- Advanced Options

  - OPERATION_TIMEOUT
    - Operations do not happen immediately. This value defines the time between an operation being submitted and it being completed.
    - Value is either a [number of seconds] or a [duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
    - `Default: 0`
  - SUBSCRIPTION_UPDATE_DELAY
    - Subscription updates do not happen immediately. This value defines the time between an operation completing and the subscription being updated.
    - Value is either a [number of seconds] or a [duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
    - `Default: 0`
  - WEBHOOK_CALL_DELAY
    - Delay before webhook is called.
    - Value is either a number of seconds or a [duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
    - `Default: 0`

- Currently Unused Options
  - PUBLISHER_ID (Required to validate publisher on activate)
  - PUBLISHER_TENANT_ID (Required to validate publisher on activate)
  - PUBLISHER_APP_ID (Required to validate publisher on activate)

Many options can be configured in UI on the `Config` page of the emulator.

All options can be passed as environment variables in the `docker run` command. For options related to using environment variables with docker run, see the [relevant Docker documentation](https://docs.docker.com/engine/reference/commandline/run/#-set-environment-variables--e---env---env-file).

## Running the emulator

### Run the emulator locally as a Docker container

- First, [build the image locally](#building-the-image). You can then run the image as follows:
  ```bash
  docker run -d -p 8080:80 marketplace-api-emulator
  ```
- The emulator will be listening on `http://localhost:8080`

### Host the emulator in Azure

- Note, there is a cost for running a container instance service
- First, [build the image locally](#building-the-image)
- Tag and push the image to a suitable container registry (eg [Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-tutorial-prepare-acr), [Docker Hub](https://docs.docker.com/engine/reference/commandline/push/))
- [Create a new Container Instance](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-tutorial-deploy-app)
  - Ensure port 80 is exposed
- The emulator will be listening on port 80 on the public IP address of the contianer instance
- You will need to update the `LANDING_PAGE_URL` with this IP or FQDN as the default value (`localhost`) only works when running locally
  - eg `LANDING_PAGE_URL=http://1.2.3.4/landing.html`
  - You can set this as an [env variable](#examples) or through the config UI
- Consider additional network security measures as this port is open on the internet

### Run & debug the emulator in VSCode

- There is a [.devcontainer](https://code.visualstudio.com/docs/devcontainers/tutorial) environment included as part of this repo
- The dev container contains all the dependencies required
- In VS Code, open the repo
- When prompted, opt to "Re-open in container" or select "Dev Containers: Reopen in Container" from the command palette
- You should now be able to "Run & Debug"
- The emulator will be listening on `http://localhost:3978`
- You can set environment variables by [creating a .env file](https://nodejs.dev/en/learn/how-to-read-environment-variables-from-nodejs/) in the root folder

### Build and run the emulator locally

- Make sure you have Node.js installed (tested with Version 18)
- Use `npm run build` to install dependencies and build 
- Use `npm run start` to run the emulator
  - Port details will be displayed the in the console 
- You can set environment variables by [creating a .env file](https://nodejs.dev/en/learn/how-to-read-environment-variables-from-nodejs/) in the root folder 

### Examples

1. Run the emulator setting the `LANDING_PAGE_URL`
   ```bash 
   docker run -d \
    -p '8080:80' \
    -e LANDING_PAGE_URL='https://www.fourthcoffee.com/landing.html' \
    'marketplace-api-emulator'
   ```
1. Run the emulator setting the `WEBHOOK_URL` and `OPERATION_TIMEOUT`

   ```bash  
   export WEBHOOK_URL='https://www.fourthcoffee.com/webhook'
   export OPERATION_TIMEOUT='PT1M'

   docker run -d \
    -p '8080:80' \
    -e 'WEBHOOK_URL' \
    -e 'OPERATION_TIMEOUT' \
    'marketplace-api-emulator'
   ```

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

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
