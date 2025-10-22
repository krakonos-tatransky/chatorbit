# Admin interface deployment guide

The administration UI ships inside the existing Next.js frontend under the `/administracia` route. When you want to publish it
on a different domain (for example `https://er400.io/chatorbit/administracia`) while keeping the customer-facing experience on
`https://chatorbit.com`, run a dedicated frontend instance and expose it through Apache or Nginx. The steps below target
Apache/ISPConfig with WordPress already running at `er400.io`.

## 1. Build a frontend instance that understands the sub-path

1. Deploy the standard backend (FastAPI) so it is reachable from the admin UI. In production we typically run the backend on
   `127.0.0.1:50001` and publish it through an ISPConfig vhost such as `https://endpoints.chatorbit.com`.
2. Create/update `infra/.env.production` (or the environment file you pass to the frontend process) with values similar to:
   ```env
   # Point the admin UI at the public API + WebSocket entrypoints
   NEXT_PUBLIC_API_BASE_URL=https://endpoints.chatorbit.com
   NEXT_PUBLIC_WS_BASE_URL=wss://endpoints.chatorbit.com

   # Tell Next.js that the entire app lives under /chatorbit so asset URLs resolve correctly
   NEXT_PUBLIC_BASE_PATH=/chatorbit
   # Optional: override if you host static assets from a CDN instead of the same origin
   # NEXT_PUBLIC_ASSET_PREFIX=https://cdn.example.com/chatorbit

   # (keep the rest of your existing values: OAuth client IDs, SMTP info, etc.)
   ```
3. Build and start the frontend with those variables exported. The production Docker Compose bundle already respects the env
   file, so from `infra/` you can run:
   ```bash
   docker compose -f docker-compose.production.yml up -d frontend
   ```
   This launches the Next.js app on `127.0.0.1:3000` with every route served from `/chatorbit/...`.

> ℹ️ If you prefer a bare-metal deployment, run the equivalent commands in the `frontend/` directory:
> ```bash
> pnpm install
> NEXT_PUBLIC_API_BASE_URL=... NEXT_PUBLIC_WS_BASE_URL=... NEXT_PUBLIC_BASE_PATH=/chatorbit \
>   pnpm build
> NEXT_PUBLIC_API_BASE_URL=... NEXT_PUBLIC_WS_BASE_URL=... NEXT_PUBLIC_BASE_PATH=/chatorbit \
>   pnpm start --hostname 127.0.0.1 --port 3000
> ```
> A process manager such as `pm2`, `systemd`, or `supervisord` can keep the service alive.

## 2. Add an Apache reverse proxy for `/chatorbit`

With the frontend listening on `127.0.0.1:3000`, configure the ISPConfig website for `er400.io` to forward the `/chatorbit`
sub-path to that service.

1. **Enable proxy modules** (one-time server action): in ISPConfig go to *System → Server Config → Web* and ensure `proxy`,
   `proxy_http`, and `proxy_wstunnel` are listed in the “Apache modules” field. Save and let ISPConfig reload Apache.
2. **Add custom directives** for the `er400.io` site (Sites → Website → Options → “Apache Directives”). Paste:
   ```apache
   ProxyPreserveHost On

   # Forward everything under /chatorbit to the Next.js admin instance
   ProxyPass        /chatorbit http://127.0.0.1:3000/chatorbit
   ProxyPassReverse /chatorbit http://127.0.0.1:3000/chatorbit

   # Allow the admin app to set its own caching headers
   <Location /chatorbit>
     Require all granted
     Header unset ETag
   </Location>
   ```
   Save the changes. ISPConfig will write them into the vhost and reload Apache.
3. Visit `https://er400.io/chatorbit/administracia`. The proxy should return the Next.js admin login. The `_next` asset paths,
   API calls, and router navigation stay inside `/chatorbit/...` because of the base-path configuration.

### WordPress `.htaccess` fallback

If you do not have access to ISPConfig’s “Apache Directives”, drop the proxy rules into the WordPress `.htaccess` file inside the
`er400.io` document root. Add them **before** the default `# BEGIN WordPress` block:
```apache
<IfModule mod_proxy.c>
  ProxyPreserveHost On
  ProxyPass        /chatorbit http://127.0.0.1:3000/chatorbit
  ProxyPassReverse /chatorbit http://127.0.0.1:3000/chatorbit
</IfModule>
```
Restart Apache after editing `.htaccess` to ensure the new proxy rules load.

## 3. Optional hardening

- Restrict access to the admin interface with HTTP Basic Auth or an allowlist of office IP addresses while OAuth/MFA is being
  configured.
- Terminate TLS at Apache (Let’s Encrypt certificates managed by ISPConfig work out of the box). All traffic between Apache and
  the Next.js process remains on the loopback interface.
- Monitor the Docker container or Node.js process using your existing tooling (Monit, systemd health checks, etc.) to restart it
  automatically after reboots.

With these steps the WordPress site continues to own `https://er400.io/`, while the ChatOrbit admin console lives at
`https://er400.io/chatorbit/administracia` and communicates securely with the production backend.
