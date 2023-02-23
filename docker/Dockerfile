FROM node:18-alpine3.16

WORKDIR /usr/src/app

RUN mkdir -p ./config

COPY ./src ./src
COPY ./package* ./
COPY ./tsconfig.json ./
COPY ./tailwind.config.js ./

ENV PORT=80

RUN apk update && apk upgrade
RUN npm install -g npm

# Docker User Namespace remapping issues in npm 9.x
# Refer to https://azureossd.github.io/2022/06/30/Docker-User-Namespace-remapping-issues/#npm-specific-issues-causing-userns-remap-exceptions
# Find any affected files and do a chown to root
RUN npm install && find ./node_modules/ ! -user root -exec chown root:root {} \;
RUN ./node_modules/typescript/bin/tsc
    
RUN npx tailwindcss -i ./src/client/input.css -o ./src/client/output.css --minify

EXPOSE 80

ENTRYPOINT [ "node" ]
CMD [ "./dist/index.js" ]
