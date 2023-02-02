# Microsoft Commercial Marketplace API Emulator

This repository contains a Node.js implementation of an emulator for the Microsoft commercial marketplace SaaS Fulfillment APIs.

To make hosting the emulator as simple as possible, the repo also includes a Dockerfile for a container image hosting the emulated APIs.

## Getting started

The emulator is a Node.js application designed to be run as a Docker container.

### Hosting the emulator

There are many different ways to access the emulator.
1. Run the emulator locally (build image yourself - requires Docker)
1. Run the emulator locally (pull image from Docker Hub - requires Docker)
1. Host the emulator in Azure (no Docker required, there is a cost)
1. Debug the emulator
1. etc 

### Using the emulator

Once the emulator is running, you can connect to it using a browser and standard tools such as the REST Client extension for VSCode, Postman etc. The URL and port will depend chosen deployment method ([see below](#running-the-emulator)). eg if you're running the emulator locally using `docker run`, you would likely connect on `http://localhost:8080`.

1. Run the emulator using your [chosen method](#running-the-emulator)
1. With a browser, connect to `http://<domain>:<port>` (domain, port depend on your run method)
   * You should be presented with a page for configuring your purchase token
1. Configure a purchase token
   1. Configure the properties on the purchase token
   1. Click on `Generate Token`
   1. Copy the resulting base64 encoded string (**not** the JSON payload)
1. Call the `resolve` API to resolve (decode) the (synthetic) purchase token
   1. This repo includes helpers to call the emulated APIs using the REST Client extension for VS Code
   1. Open this repo in VS Code
   1. Install the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
   1. Open [subscription-apis.http](rest_calls/subscription-apis.http) from the `\rest_calls` folder
   1. In `subscription-apis.http` set
      * `publisherId [string]` simulates the Publisher ID (can be anything you like eg Contoso Corp)
      * `baseUrl [sting]` format as above eg `http://localhost:8080`
      * `purchaseToken [string]` the base64 encoded string
   1. Click on `Send Request` (under ### Resolve)
      * You should see a Response appear with a `200 OK` status
      * The payload will include the decoded purchase token
1. Call the `activate` API to activate the purchase
   1. In `subscription-apis.http`
   1. Update the `planId` on the `activate` request to match a valid *planId* as set in the purchase token
   1. Click on `Send Request` on the `activate` API call
   1. You should see a `200 OK` status
   1. The payload will be `OK`

At this point you have
   * Created a (synthetic) purchase token
   * Resolved that purchase token to its properties
   * Activated the purchase

You can now call other APIs to see their response
   * eg the `GetSubscriptions` API would return a list of all subscriptions
   * Currently this will return a collection with one item, the subscription you activated in the previous steps

There are helpers for all available SaaS Fulfillment v2 APIs in
   * [subscription-apis.http](rest_calls/subscription-apis.http)
   * [operations-apis.http](rest_calls/operations-apis.http) 

For more details on the available APIs and their operation, see
   * [SaaS subscription life cycle](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-life-cycle)
   * [Subscription APIs](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api)
   * [Operations APIs](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-operations-api)

## Functionality

The solution emulates all operations on the [SaaS Fulfillment APIs v2](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-life-cycle) closely. It is not 100% fidelity (see [Limitations](#limitations) below. Any solution should be [thoroughly tested against the marketplace APIs](https://learn.microsoft.com/azure/marketplace/test-saas-overview).

Capabilities include the following:
  * Generate a 'faux' [purchase identification token](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api#resolve-a-purchased-subscription) with customisable subscription properties that can be resolved by the emulated `resolve` API
  * Publisher ID can be set by query string parameter (`publisherId`) or authorization header
  * Testing the following flows:
    * Landing page flow
    * Activation flow
    * Update flow
    * Suspend and reinstate flow
    * Webhook flows

The format of the [purchase identification token](https://learn.microsoft.com/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api#resolve-a-purchased-subscription) is not documented. This has been simulated with a base64 encoded JSON payload including the properties to be set in the subscription.

## Limitations

TBA

## Building the image
You can pull the image from Docker Hub ([see below](#running-the-emulator)). However, if you don't want to use the hosted image, you can easily build the Docker image yourself:
  * Clone this repo
  * cd into the repo folder
  * To build the Docker image run:
    ```
    docker build -t marketplaceapiemulator -f docker/Dockerfile .
    ```
  * You will now have a Docker image tagged `marketplaceapiemulator`

## Configuration

There are a number of configuration options that can be set on the emulator. 
  * OPERATION_TIMEOUT
    * Operations do not happen immediately. This value defines the time between an operation being submitted and it being completed.
    * Value is either a [number of seconds] or a [duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
    * `Default: 0`
  * SUBSCRIPTION_UPDATE_DELAY
    * Subscriptions updates do not happen immediately. This value defines the time between an operation completing and the subscription being updated.
    * Value is either a [number of seconds] or a [duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
    * `Default: 0`
  * WEBHOOK_CALL_DELAY
    * Delay before webhook is called.
    * Value is either a number of seconds or a [duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
    * `Default: 0`
  * WEBHOOK_URL (URL)
    * The URL of your webhook service (use if you want to exercise your webhook implementation)
    * `Default: None`
  * LANDING_PAGE_URL (URL)
    * The URL of your landing page (use if you want to exercise your landing page implementation)
    * `Default: None`
  * SKIP_DATA_LOAD (boolean)
    * Tell the emulator not to load any existing data file on startup.
    * This value is only used during startup so runtime modification will have no effect
    * `Default: false`

All options can be passed as environment variables in the `docker run` command or configured via UI in the emulator. For options related to using environment variables with docker run, see the [relevant Docker documentation](https://docs.docker.com/engine/reference/commandline/run/#-set-environment-variables--e---env---env-file).

Configuration values can be changed at runtime either via the UI or through the utility API (PATCH /api/utility/config).

## Running the emulator

### Run the emulator locally
* The following will pull the image from Docker Hub and launch on your machine
    ```bash
    docker run -d -p 8080:80 mormond/marketplace-api-emulator:latest
    ```
* If you have the [built the image](#building-the-image) locally, you can run the image as follows:
    ```bash
    docker run -d -p 8080:80 marketplace-api-emulator
    ```
* The emulator will be listening on `http://localhost:8080`
### Host the emulator in Azure 
* There is a cost for the container instance service)
* In the Azure portal, create a new Container Instance
* Configure as follows:
    * Image source: `Other registry`
    * Image type: `Public`
    * Image: `mormond/marketplace-api-emulator`
    * OS type: `Linux`
* You can find the IP address for the container instance on the overview page
* Alternatively, you can use the Azure CLI
    ```bash
    az group create --name myResourceGroup --location westeurope

    az container create \
        --resource-group myResourceGroup \
        --name mycontainer \
        --image mormond/marketplace-api-emulator \
        --dns-name-label marketplace-api-emulator \
        --ports 80
    ```
* The emulator will be listening on port 80
* You should consider additional network security measure as this port is open on the internet
### Run the emulator in a debug configuration
* There is a [.devcontainer](https://code.visualstudio.com/docs/devcontainers/tutorial) environment included as part of this repo
* The dev container contains all the dependencies required
* In VS Code, open the repo 
* When prompted, opt to "Re-open in container" or select "Dev Containers: Reopen in Container" from the command palette
* You should now be able to "Run & Debug"
* The emulator will be listening on port 3978

## Examples

1. Run from Docker Hub setting the WEBHOOK_URL
    ```bash
    docker run -d -p 8080:80 -e WEBHOOK_URL=https://www.bing.com mormond/marketplace-api-emulator:latest
    ```
1. Run from Docker Hub setting the WEBHOOK_URL and OPERATION_TIMEOUT
    ```bash
    export WEBHOOK_URL='https://www.bing.com'
    export OPERATION_TIMEOUT='PT1M'

    docker run -d -p 8080:80 -e WEBHOOK_URL -e OPERATION_TIMEOUT mormond/marketplace-api-emulator:latest
    ```# Project

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
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
