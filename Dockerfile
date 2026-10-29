FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* frontend/bun.lock* ./
RUN npm ci

COPY frontend .

ARG VITE_API_BASE=https://clickortrick.pgthegod.space/api
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM node:20-alpine AS backend

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --omit=dev

COPY src ./src
COPY docs ./docs
COPY scripts ./scripts

COPY --from=frontend-build /frontend/dist ./public

ENV NODE_ENV=production \
    PORT=4000 \
    FRONTEND_DIST_PATH=/app/public

EXPOSE 4000

CMD ["node", "src/server.js"]
