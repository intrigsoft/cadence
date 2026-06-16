# Cadence app — SvelteKit (@sveltejs/adapter-node).
# Build with devDeps, then ship a pruned production image that runs `node build`.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# adapter-node honors PORT/HOST; Railway injects PORT. HOST defaults to 0.0.0.0.
ENV PORT=3000
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "build"]
