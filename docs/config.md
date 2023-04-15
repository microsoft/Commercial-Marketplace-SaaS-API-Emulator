# Configuring the emulator

There are a number of configuration options that can be set on the emulator.

**Common Options**

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
- NO_SAMPLES (boolean)
  - Tell the emulator not to configure any sample offers on startup. This value is only used during startup.
  - `Default: false`

**Publisher Options**

**Note:** Publisher ID options only apply to the built-in landing page. They are used to set the Publisher ID for requests to `resolve` and `activate` APIs from the built-in landing page. If you are using your own landing page, you do not need to set these Publisher ID options.

Either PUBLISHER_ID or PUBLISHER_TENANT_ID & PUBLISHER_APP_ID should be used.

- PUBLISHER_ID
  - The value to be used as the publisherId query string parameter for the Publisher ID
  - `Default: FourthCoffee`
- PUBLISHER_TENANT_ID
  - Used in conjunction with the PUBLISHER_APP_ID to create a Publisher ID
  - `Default: undefined`
- PUBLISHER_APP_ID
  - Used in conjunction with the PUBLISHER_TENANT_ID to create a Publisher ID
  - `Default: undefined`

**Webhook Behaviour**

When the marketplace sends a webhook request, it now passes an Azure Active Directory signed access token. By default, the emulator doesn't do this. However, to reproduce this behaviour, use the following configuration to allow the emulator to obtain an access token for your application:

- CLIENT_ID
- CLIENT_SECRET
- TENANT_ID

These values can be obtained from an Azure Active Directory App Registration.

**Note**
There are some differences between the token sent by Azure Marketplace and the emulator. Both are AAD signed, v2 access tokens with the configured client id (`aud` claim) and tenant id (`tid` claim) which allows the signature to be verified in the same way. However, some of the other claims will differ.

**Advanced Options**

**Note:** Advanced Options are there to better simulate the behaviour of the marketplace (the time it takes for operations to complete)

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
- REQUIRE_AUTH
  - Requires a [v1 AAD bearer token](https://learn.microsoft.com/en-us/partner-center/marketplace/partner-center-portal/pc-saas-registration#how-to-get-the-publishers-authorization-token) to be passed in the Authorization header with the resource/audience of the marketplace service (`20e940b3-4c77-4b0b-9a53-9e16a1b010a7`) and issuer as `https://sts.windows.net/{publisher tenant id}/`

All options can be passed as environment variables. Some can be configured in UI on the `Config` page of the emulator.

## Configuration Examples

### Configuring when running locally or in VS Code

You can set environment variables by [creating a .env file](https://nodejs.dev/en/learn/how-to-read-environment-variables-from-nodejs/) in the root folder. Example .env file that sets `PORT`, `LANDING_PAGE_URL` and `SKIP_DATA_LOAD`

```text
PORT=80
LANDING_PAGE_URL='http://localhost:3000/landing.html'
SKIP_DATA_LOAD=TRUE
```

### Configuring Docker images

You can either set environment variables directly in the `docker run` command or pass values exported from the shell. For options related to using environment variables with docker run, see the [relevant Docker documentation](https://docs.docker.com/engine/reference/commandline/run/#-set-environment-variables--e---env---env-file). For example:

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
