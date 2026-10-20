FROM node:24-alpine AS build
# Subconjunto de módulos del frontend ("*" = todos). Lo consume el plugin virtual:pastel-modules (WP7).
ARG PASTEL_MODULES=*
ENV PASTEL_MODULES=${PASTEL_MODULES}
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM nginx:1.28-alpine AS runtime
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /web/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /etc/nginx/templates /etc/nginx/snippets \
    && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
