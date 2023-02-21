# Getting up and running with the emulator

## Running the emulator

Which deployment option is best is largely a matter of personal preference.

If you have Docker installed, then building and running the container locally is a simple option.

If you use Dev Containers in VS Code, there is a Dev Container definition in the project that includes all the required dependencies. You can simply "Re-open in container" from VS Code and run from there.

If you prefer to run locally, make sure you have Node.js installed.

### Run the emulator as a Docker container locally

- First, [build the image](#building-as-a-docker-image)
- Then run the image as follows:

  ```bash
  docker run -d -p <port>:80 marketplace-api-emulator
  ```

- The emulator will be listening on `http://localhost:<port>`
- For more configuration options see [configuration examples](./config.md)

### Host the emulator in Azure

- Note, there is a cost for running an Azure Container Instance
- Either
  - [build the image locally](#building-as-a-docker-image), then tag and push the image to a suitable container registry (eg [Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-tutorial-prepare-acr), [Docker Hub](https://docs.docker.com/engine/reference/commandline/push/))
  - If you are using Azure Container Registry, you can [build and push the image using the Azure CLI](https://learn.microsoft.com/azure/container-registry/container-registry-quickstart-task-cli#build-and-push-image-from-a-dockerfile)
- [Create a new Container Instance](https://learn.microsoft.com/en-us/azure/container-instances/container-instances-tutorial-deploy-app)
  - Ensure port 80 is exposed
- The emulator will be listening on port 80 on the public IP address of the container instance
- You will need to update the `LANDING_PAGE_URL` with this IP or FQDN
  - the default value (`localhost`) only works when running locally
  - eg `LANDING_PAGE_URL=http://1.2.3.4/landing.html`
  - You can set this as an [env variable](./config.md) or through the config UI
- Consider additional network security measures as this port is open on the internet

### Run & debug the emulator in VS Code

- Make sure you have Node.js installed (tested with Version 18)
- In VS Code, open the repo
- Select "Run & Debug -> Launch Program"
- The emulator will be listening on `http://localhost:3978`
- You can set environment variables by [creating a .env file](https://nodejs.dev/en/learn/how-to-read-environment-variables-from-nodejs/) in the root folder

### Run & debug the emulator in VS Code (using Dev Container)

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

## Building as a Docker image

Building as a Docker image is as simple as:

1. Clone this repo
1. `cd` into the repo folder
1. Build the Docker image with:

    ```bash
    docker build -t marketplaceapiemulator -f docker/Dockerfile .
    ```

1. This will create a Docker image tagged `marketplaceapiemulator`

## Configuring the emulator

See [Configuring the emulator](config.md)
