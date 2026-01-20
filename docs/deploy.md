# Deploy (systemd + nginx)

Este documento describe un flujo de deploy para ambientes dev/prod usando systemd + nginx.

## Requisitos
- Node.js 18+
- PostgreSQL 15+
- Nginx
- Usuario con permisos para systemd

## Variables de entorno
- Copia `apps/api/.env.production.example` -> `apps/api/.env.production`
- Copia `apps/web/.env.production.example` -> `apps/web/.env.production`
- En systemd define `NODE_ENV=production` (o `APP_ENV=production`)
- Define `CORS_ORIGIN` con lista separada por coma (sin `*`)
- La API carga `.env` y luego `.env.<ambiente>` segun `APP_ENV` o `NODE_ENV`

## Build y migraciones
```bash
cd /var/www/inventario/apps/api
npm install
npm run prisma:generate
npm run prisma:deploy
npm run build

cd /var/www/inventario/apps/web
npm install
npm run build
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
  listen 80;
  server_name app.example.com;

  root /var/www/inventario/apps/web/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

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
curl -I http://localhost/api/v1/health
```

## Notas
- Si usas nginx como proxy, deja `VITE_API_URL="/api/v1"` en `apps/web/.env.production`.
- En produccion usa `TRUST_PROXY="true"` y `ENABLE_DOCS="false"`.
- Para ambiente dev en la VPS, usa otro puerto (ej: 4001) y otro archivo `.env.development`.
