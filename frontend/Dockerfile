# The portal's web app as a container image: the built files plus a small web server.
#
# Step 1 builds the app on the CPU of the machine doing the build. The result is plain files, the
# same for any CPU, so nothing here needs to be ARM.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# where the app sends its requests. Vite writes it into the JavaScript, so it is needed now,
# not when the container starts. It is a public address, not a secret.
ARG VITE_API_URL
RUN npm run build

# Step 2 is the image that runs: only the built files. No Node, no source, no node_modules.
# This nginx image does not run as root and listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
