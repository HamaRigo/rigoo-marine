# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY rigoo-marine-frontend/package.json ./
RUN npm install
COPY rigoo-marine-frontend/ ./
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY rigoo-marine-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
