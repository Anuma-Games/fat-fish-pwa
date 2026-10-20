# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# API_KEY is empty in the image; the real key is passed only when the container runs (docker run -e or compose).

# ---- Build stage: compiles the Angular PWA ----
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached while package-lock.json does not change
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build

# ---- Runtime stage: Nginx serves the static build and forwards /api to the API ----
# Unprivileged image: Nginx runs without root and listens on port 8080
FROM nginxinc/nginx-unprivileged:1.29-alpine

# The official entrypoint replaces ${API_URL} and ${API_KEY} in the template when the container starts
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/Pwa_FatFish/browser /usr/share/nginx/html

ENV API_URL=http://api:8080 \
    API_KEY=""

EXPOSE 8080
