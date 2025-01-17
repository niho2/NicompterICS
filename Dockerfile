# Build-Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiere nur package.json zuerst
COPY package.json ./

# Installiere Abhängigkeiten
RUN npm install

# Kopiere restliche Projektdateien
COPY . .

# Erstelle Production-Build
RUN npm run build

# Production-Stage
FROM nginx:alpine

# Setze Arbeitsverzeichnis
WORKDIR /usr/share/nginx/html

# Kopiere nginx Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopiere Build-Dateien von der Build-Stage
COPY --from=builder /app/dist .

# Exponiere Port 80
EXPOSE 80

# Setze Umgebungsvariablen für Production
ENV NODE_ENV=production

# Starte nginx
CMD ["nginx", "-g", "daemon off;"] 