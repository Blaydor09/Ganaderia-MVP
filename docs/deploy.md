# Deploy (systemd + nginx)

Este documento describe un flujo de deploy para ambientes dev/prod usando systemd + nginx.

## Requisitos
- Node.js 20.19+
- PostgreSQL 15+
- Nginx
- Usuario con permisos para systemd

## Variables de entorno
- Copia `apps/api/.env.production.example` -> `apps/api/.env.production`
- Copia `apps/web/.env.production.example` -> `apps/web/.env.production`
- En systemd define `APP_ENV=production` y `NODE_ENV=production`
- Define `CORS_ORIGIN` con lista separada por coma (sin `*`)
- La API exige `APP_ENV` y carga después `.env.<ambiente>`

## Build y migraciones
```bash
cd /var/www/inventario/apps/api
npm ci
npm run prisma:generate
npm run build

cd /var/www/inventario/apps/web
npm ci
npm run build
```

Las migraciones se ejecutan como una etapa separada, una sola vez y después de verificar un backup:

```bash
cd /var/www/inventario/apps/api
npm run prisma:deploy
```

## systemd (API)
Archivo `/etc/systemd/system/ganaderia-api.service`:
```ini
[Unit]
Description=Inventario Ganaderia API
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/inventario/apps/api
Environment=NODE_ENV=production
Environment=APP_ENV=production
EnvironmentFile=/var/www/inventario/apps/api/.env.production
ExecStart=/usr/bin/node /var/www/inventario/apps/api/dist/index.js
Restart=on-failure
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Activar servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ganaderia-api
```

## nginx (frontend + proxy API)
Ejemplo de bloque `server` (ajusta `server_name` y rutas):
```nginx
server {
  listen 443 ssl http2;
  server_name app.example.com;

  root /var/www/inventario/apps/web/dist;
  index index.html;

  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Si Cloudflare está delante de Nginx, configura `real_ip_header CF-Connecting-IP` y `set_real_ip_from` **únicamente** con los rangos oficiales de Cloudflare, mantenidos en un archivo separado. No aceptes esa cabecera desde clientes que alcancen directamente el origen.

## Validacion rapida
Backend (API):
```bash
cd /var/www/inventario/apps/api
npm run prisma:generate
npm test
npm run build
```

Frontend (WEB):
```bash
cd /var/www/inventario/apps/web
npm run build
```

Health check:
```bash
curl -fsS https://app.example.com/api/v1/health/live
curl -fsS https://app.example.com/api/v1/health/ready
```

## Notas
- Si usas nginx como proxy, deja `VITE_API_URL="/api/v1"` en `apps/web/.env.production`.
- En produccion usa `TRUST_PROXY="true"` y `ENABLE_DOCS="false"`.
- Para ambiente dev en la VPS, usa otro puerto (ej: 4001) y otro archivo `.env.development`.
