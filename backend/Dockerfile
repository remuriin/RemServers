# The portal's backend as a container image.
#
# Unlike the web app, this one is built on the same kind of CPU it runs on (ARM): bcrypt contains
# compiled code, and "npm ci" picks the copy that matches the machine it runs on.

# Step 1: all packages, and TypeScript turned into JavaScript in dist/.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Step 2 is the image that runs: the packages the app needs to run (no TypeScript, no nodemon) and dist/.
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# the image's built-in user that is not root
USER node
EXPOSE 3000
# the settings (database, keys) are not in the image: Kubernetes hands them in when the pod starts
CMD ["node", "dist/server.js"]
