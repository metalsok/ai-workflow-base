FROM node:26-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY angular.json tsconfig.json .postcssrc.json ./
COPY apps ./apps
COPY tests/support/browser-igdb.ts tests/support/igdb.ts ./tests/support/
RUN npm run build && npx tsc --ignoreConfig --target ES2023 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck --rootDir tests/support --outDir dist/fixtures tests/support/browser-igdb.ts tests/support/igdb.ts

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev && npm cache clean --force

FROM node:26-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist/api ./dist/api
COPY --from=build /app/dist/web ./dist/web
COPY package.json package-lock.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/api/main.js"]

FROM runtime AS verification
COPY --from=build /app/dist/fixtures ./verification/fixtures
COPY tests/support/packaged-igdb.mjs ./verification/igdb.mjs
CMD ["node", "--import", "./verification/igdb.mjs", "dist/api/main.js"]

# A plain docker build also produces the fixture-free production image.
FROM runtime AS production
