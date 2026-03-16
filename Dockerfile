# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time env vars (Railway injiziert diese über --build-arg oder Railway Variables)
ARG VITE_STRAVA_CLIENT_ID
ARG VITE_API_URL

ENV VITE_STRAVA_CLIENT_ID=$VITE_STRAVA_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# SPA-Routing: alle Routen auf index.html umleiten
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
