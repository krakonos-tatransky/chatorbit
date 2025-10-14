# Deploying ChatOrbit with ISPConfig

This guide explains how to host the ChatOrbit application on a VPS or dedicated server managed through [ISPConfig](https://www.ispconfig.org/).
It assumes you already have SSH access to the server, administrator privileges in the ISPConfig control panel, and a registered domain name pointed at the server's IP address.

## 1. Prepare the server

1. **Update the base OS**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. **Install Docker Engine and Compose plugin** (recommended for the existing `infra/docker-compose.yml` stack).
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER  # log out/in after running
   ```
   If you cannot use Docker, skip this and plan to run the frontend/backend with systemd services (see _Alternative: native services_ below).
3. **Install supporting packages** (adjust for your ISPConfig web server)
   ```bash
   # For Apache-managed servers
   sudo apt install -y apache2 certbot python3-certbot-apache git rsync

   # For Nginx-managed servers
   sudo apt install -y nginx certbot python3-certbot-nginx git rsync
   ```

## 2. Configure DNS and ISPConfig sites

1. **Create DNS records** in ISPConfig so all application hostnames resolve to the VPS:
   - `chatorbit.com` → public IPv4/IPv6 of the server (frontend)
   - `endpoints.chatorbit.com` → same IP (API + WebSocket)
   - `turn.chatorbit.com` → TURN server (reuse the existing ISPConfig site) _or_ point `turn.l0l0l0.com` to the TURN host if you prefer to isolate it.
2. **Add/confirm the web domains** in ISPConfig:
   - `chatorbit.com` should already exist. We will update its proxy directives later so it forwards to the frontend container.
   - Create a second site for `endpoints.chatorbit.com`. Disable auto-created web content—the API lives behind a reverse proxy.
   - Leave **Let's Encrypt SSL** unchecked for now; we will request certificates after the containers are healthy.
   - Note the document roots (typically `/var/www/clients/clientX/webY/web`). These paths are also where ISPConfig expects per-site configuration snippets.

## 3. Fetch the ChatOrbit code

SSH into the server and deploy the repository into the website directory (or another path you control, such as `/var/www/chat-orbit`).

```bash
cd /var/www/clients/clientX/webY
sudo -u webX git clone https://github.com/your-org/chatorbit.git app
cd app
```

Replace `clientX`, `webY`, and `webX` with the client/site identifiers ISPConfig generated. Use `sudo -u webX` to keep ownership consistent with ISPConfig's expectations.

## 4. Configure environment

1. **Copy the production template** and adjust hostnames/credentials. The repo ships `infra/.env.production.example` with sane defaults for `https://chatorbit.com` (frontend) and `https://endpoints.chatorbit.com` (API).
   ```bash
   sudo -u webX cp infra/.env.production.example infra/.env.production
   sudo -u webX nano infra/.env.production  # or your preferred editor
   ```
   - Set `CHAT_CORS_ALLOWED_ORIGINS` to the origins that should call the API (e.g., `https://chatorbit.com,https://www.chatorbit.com`).
   - Confirm the TURN hostnames/credentials. Change `NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_URLS` if you relocate Coturn to `turn.l0l0l0.com`.
2. **Configure persistence**. The default SQLite database writes to `backend/data`. Make sure this directory is writable by the web user:
   ```bash
   sudo -u webX mkdir -p backend/data
   sudo chown webX:clientX backend/data
   ```

## 5. Deploy with Docker Compose (recommended)

1. Review `infra/docker-compose.production.yml` to confirm the loopback bindings and environment defaults match your DNS decisions. The file expects `infra/.env.production` and keeps the backend on `127.0.0.1:50001` plus the frontend on `127.0.0.1:3000`.
   ```bash
   sudo -u webX sed -n '1,160p' infra/docker-compose.production.yml
   ```
2. Adjust anything project-specific (image tags, TURN URLs, rate limits) by editing `infra/.env.production`—the Compose file now reads every variable from there with sensible fallbacks. Only change the YAML if you need additional services or non-loopback bindings.
3. Create a systemd unit for the Compose stack (run as root):
   ```bash
   sudo tee /etc/systemd/system/chatorbit.service <<'UNIT'
   [Unit]
   Description=ChatOrbit Docker Compose stack
   Requires=docker.service
   After=docker.service

   [Service]
   WorkingDirectory=/var/www/clients/clientX/webY/app/infra
   ExecStart=/usr/bin/docker compose -f docker-compose.production.yml up --build
   ExecStop=/usr/bin/docker compose -f docker-compose.production.yml down
   Restart=always
   User=webX
   Group=clientX

   [Install]
   WantedBy=multi-user.target
   UNIT
   sudo systemctl daemon-reload
   sudo systemctl enable --now chatorbit.service
   ```
4. Confirm the services are running and configuration renders without YAML errors:
   ```bash
   docker compose -f infra/docker-compose.production.yml config
   sudo journalctl -u chatorbit.service -f
   ```

## 6. Configure the web server via ISPConfig

Reverse proxy traffic from ISPConfig's managed web server to the ChatOrbit containers. Because `chatorbit.com` and `endpoints.chatorbit.com` live as separate ISPConfig sites, configure directives on each vhost. Adjust upstream ports if you changed them in Compose.

### Apache directives

1. Enable proxy modules once (run as root):
   ```bash
   sudo a2enmod proxy proxy_http proxy_wstunnel headers
   sudo systemctl reload apache2
   ```
2. **Frontend (`chatorbit.com`)** – Under *Options → Apache Directives* add:
   ```apache
   ProxyPreserveHost On
   RequestHeader set X-Forwarded-Proto expr=%{REQUEST_SCHEME}

   ProxyPass "/" "http://127.0.0.1:3000/" retry=0
   ProxyPassReverse "/" "http://127.0.0.1:3000/"
   ```
   Add `ProxyPassReverseCookieDomain 127.0.0.1 chatorbit.com` if you later enable cookie-based auth.
3. **API (`endpoints.chatorbit.com`)** – Add the following directives:
   ```apache
   ProxyPreserveHost On
   RequestHeader set X-Forwarded-Proto expr=%{REQUEST_SCHEME}

   ProxyPass "/ws/"  "ws://127.0.0.1:50001/ws/" retry=0
   ProxyPassReverse "/ws/"  "ws://127.0.0.1:50001/ws/"

   ProxyPass "/" "http://127.0.0.1:50001/" retry=0
   ProxyPassReverse "/" "http://127.0.0.1:50001/"
   ```
   If you expose additional FastAPI routes (e.g., `/docs`), they inherit the root proxy.

### Nginx directives

Add snippets under *Options → nginx Directives* on each site.

- **Frontend (`chatorbit.com`)**
  ```nginx
  location / {
      proxy_pass http://127.0.0.1:3000/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```
- **API (`endpoints.chatorbit.com`)**
  ```nginx
  location /ws/ {
      proxy_pass http://127.0.0.1:50001/ws/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
  }

  location / {
      proxy_pass http://127.0.0.1:50001/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```

Save each website. ISPConfig will reload Apache/Nginx with the new reverse proxy configuration.

## 7. Issue HTTPS certificates

After each hostname resolves to your server, revisit the corresponding ISPConfig site and enable the **Let's Encrypt SSL** checkbox. Save the form; ISPConfig will provision the certificate and reload the web server automatically. Verify with:

```bash
curl -I https://chatorbit.com
curl -I https://endpoints.chatorbit.com
```

Keep the existing TURN vhost (`turn.chatorbit.com` or `turn.l0l0l0.com`) enrolled in Let's Encrypt as well so WebRTC clients trust the TURN certificate.

## 8. Rolling updates

To deploy a new version:

```bash
cd /var/www/clients/clientX/webY/app
sudo -u webX git pull
sudo systemctl restart chatorbit.service
```

Consider enabling zero-downtime updates by using Compose's `pull` + `up -d` or integrating with CI/CD.

## 9. Alternative: native services

If Docker is not allowed, you can run the components directly:

1. **Backend (FastAPI/Uvicorn)**
   ```bash
   sudo -u webX python3 -m venv backend/env
   sudo -u webX backend/env/bin/pip install -r backend/requirements.txt
   sudo tee /etc/systemd/system/chatorbit-backend.service <<'UNIT'
   [Unit]
   Description=ChatOrbit backend
   After=network.target

   [Service]
   WorkingDirectory=/var/www/clients/clientX/webY/app/backend
   Environment="CHAT_DATABASE_URL=sqlite:///./data/chat_orbit.db"
   EnvironmentFile=/var/www/clients/clientX/webY/app/infra/.env.production
   ExecStart=/var/www/clients/clientX/webY/app/backend/env/bin/uvicorn app.main:app --host 127.0.0.1 --port 50001
   Restart=always
   User=webX
   Group=clientX

   [Install]
   WantedBy=multi-user.target
   UNIT
   sudo systemctl enable --now chatorbit-backend.service
   ```

2. **Frontend (Next.js)** – Build the static output and serve via Nginx:
   ```bash
   cd /var/www/clients/clientX/webY/app/frontend
   sudo -u webX pnpm install
   sudo -u webX NEXT_PUBLIC_API_BASE_URL=https://endpoints.chatorbit.com pnpm build
   sudo -u webX pnpm next export --outdir ../dist
   ```
   Update the ISPConfig website to serve the static `dist` directory and keep the `/` → frontend and `/ws` → backend proxies described above.

## 10. Backups and monitoring

- Use ISPConfig's backup features or schedule cron jobs to archive `/var/www/clients/clientX/webY/app/backend/data` (SQLite) and `.env` files.
- Monitor services with `systemctl status`, `journalctl`, or integrate with external monitoring tools.
`sudo journalctl -u chatorbit.service -f -n 50`
- Configure firewall rules (e.g., UFW) to allow only necessary ports (80, 443, SSH, TURN if applicable).

Following these steps will deploy ChatOrbit under ISPConfig while keeping ownership and permissions aligned with the panel, enabling HTTPS, and providing a reproducible update path.
