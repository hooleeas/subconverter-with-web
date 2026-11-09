FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/data/app.db
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p data
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY ACL4SSR ./ACL4SSR
EXPOSE 3000
CMD ["npm","start"]
