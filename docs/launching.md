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

### Building locally

Building as a Docker image is as simple as:

1. Clone this repo
1. `cd` into the repo folder
1. Build the Docker image with:

    ```bash
    docker build -t marketplace-api-emulator -f docker/Dockerfile .
    ```

1. This will create a Docker image tagged `marketplace-api-emulator`

### GitHub workflow to build & push to a container registry

The repo includes a workflow [publish-docker-image.yml](../.github/workflows/publish-docker-image.yml) to automatically build and push the Docker image to your choice of container registry (Azure Container Registry, GitHub or Docker Hub).

The workflow can be manually triggered from the GitHub Actions UI. Depending on your target registry, you may need to set some GitHub Action secrets (Settings > Secrets and variables) before running the workflow.

- Required secrets
  - GitHub container registry
    - No secrets necessary
  - Azure container registry
    - `REGISTRY_ACR` secret value - set to the ACR login server eg `marketplaceapiemulator.azurecr.io`
    - `ACR_USERNAME` secret value - set to the ACR username (can be found in Settings > Access keys)
    - `ACR_PASSWORD` secret value - set to the ACR password (can be found in Settings > Access keys)
  - Docker Hub
    - `DOCKER_USERNAME` secret value - set to your Docker Hub username
    - `DOCKER_PASSWORD` secret value - set to your Docker Hub password

Having set the relevant secrets, launch the workflow and select the target registry in the dropdown. The container image will be built and pushed to the selected registry.

This can make the launch process as simple as

```bash
docker run <registry-name>/<repo-name>:latest
```

## Configuring the emulator

See [Configuring the emulator](config.md)
