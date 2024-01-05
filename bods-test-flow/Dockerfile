FROM node:16 as base
ENV NODE=ENV=production
ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENV VARIANT_VERSION=0.38.0
RUN curl -o - -sL https://github.com/mumoshu/variant/releases/download/v${VARIANT_VERSION}/variant_${VARIANT_VERSION}_linux_amd64.tar.gz |tar zxvf -
RUN chmod +x ./variant
RUN apt update && apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && rm -rf /var/lib/apt/lists/*
RUN mkdir /app && chown -R node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package.json package-lock*.json ./
RUN npm ci && npm cache clean --force
ENV PATH=/app/node_modules/.bin:$PATH


FROM base as source
COPY --chown=node:node . .

FROM source as test
ENV NODE_ENV=development
RUN npm i eslint
#RUN eslint .
#RUN npm test


FROM test as audit
USER root
RUN npm audit --audit -level critical

FROM audit AS vulnscan
COPY --from=aquasec/trivy:latest /usr/local/bin/trivy /usr/local/bin/trivy
RUN trivy filesystem --exit-code 1 --no-progress /



ENTRYPOINT ["/tini", "--"]
