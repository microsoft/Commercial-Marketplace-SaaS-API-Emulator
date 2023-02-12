FROM node:18.13-alpine3.16

WORKDIR /usr/src/app

RUN mkdir -p ./config

COPY ./src ./src
COPY ./package* ./
COPY ./tsconfig.json ./
COPY ./tailwind.config.js ./

ENV PORT=80

RUN apk update && apk upgrade

RUN npm install && ./node_modules/typescript/bin/tsc
RUN npx tailwindcss -i ./src/client/input.css -o ./src/client/output.css --minify

EXPOSE 80

ENTRYPOINT [ "node" ]
CMD [ "./dist/index.js" ]
