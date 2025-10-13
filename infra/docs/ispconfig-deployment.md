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

## 2. Configure DNS and a site in ISPConfig

1. **Create DNS records** in ISPConfig for the desired hostnames (e.g., `chat.example.com`). Ensure A/AAAA records point to the server.
2. **Add a web domain** in ISPConfig:
   - Go to **Sites → Websites → Add new website**.
   - Set the domain (e.g., `chat.example.com`).
   - Choose the correct web server (`apache` or `nginx`) and disable auto-created web content (the app will be reverse-proxied).
   - Enable **Let's Encrypt SSL** but leave it unchecked for now—we will request the certificate after deployment.
   - Note the document root (typically `/var/www/clients/clientX/webY/web`).
3. (Optional) Add a separate **subdomain** for the API if you prefer to split frontend and backend (e.g., `api.chat.example.com`). Repeat the website creation steps.

## 3. Fetch the ChatOrbit code

SSH into the server and deploy the repository into the website directory (or another path you control, such as `/var/www/chat-orbit`).

```bash
cd /var/www/clients/clientX/webY
sudo -u webX git clone https://github.com/your-org/chatorbit.git app
cd app
```

Replace `clientX`, `webY`, and `webX` with the client/site identifiers ISPConfig generated. Use `sudo -u webX` to keep ownership consistent with ISPConfig's expectations.

## 4. Configure environment

1. **Create an `.env` file** for backend and frontend overrides. At minimum set the public base URLs so the frontend talks to the proxied backend:
   ```bash
   cat <<'ENV' | sudo -u webX tee infra/.env.production
   NEXT_PUBLIC_API_BASE_URL=https://chat.example.com/api
   NEXT_PUBLIC_WS_BASE_URL=wss://chat.example.com/api
   NEXT_PUBLIC_WEBRTC_DEFAULT_STUN_URLS=stun:stun.l.google.com:19302
   NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_URLS=turn:turn.chatorbit.com:443,turn:turn.chatorbit.com:443?transport=tcp
   NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_USERNAME=pakalolo
   NEXT_PUBLIC_WEBRTC_DEFAULT_TURN_CREDENTIAL=275ea323d4eac7f635ef5cd3518f32af957beaeb6e6579fad5e1009903b7d5e4
   CHAT_CORS_ALLOWED_ORIGINS=https://chat.example.com
   CHAT_CORS_ALLOW_CREDENTIALS=false
   ENV
   ```
2. **Configure persistence**. The default SQLite database writes to `backend/data`. Make sure this directory is writable by the web user:
   ```bash
   sudo -u webX mkdir -p backend/data
   sudo chown webX:clientX backend/data
   ```

## 5. Deploy with Docker Compose (recommended)

1. Review the production-oriented Compose file that ships with the repo:
   ```bash
   sudo -u webX sed -n '1,120p' infra/docker-compose.production.yml
   ```
   The file already restricts published ports to `127.0.0.1` so ISPConfig can proxy HTTP/S traffic, sets `NEXT_PUBLIC_*` URLs to `https://endpoints.chatorbit.com`, and exposes TURN servers at `turn.chatorbit.com`.
2. If you need to tweak ports or domains, edit `infra/docker-compose.production.yml` as the web user. Keep the backend bound to `127.0.0.1:50001` and frontend to `127.0.0.1:3000` when using Apache or Nginx as the reverse proxy.
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

Reverse proxy traffic from ISPConfig's managed web server to the ChatOrbit services. Adjust upstream ports to match the values in your Compose file.

### Apache directives

1. Ensure the required modules are enabled on the server (run as root once):
   ```bash
   sudo a2enmod proxy proxy_http proxy_wstunnel headers
   sudo systemctl reload apache2
   ```
2. In ISPConfig, edit the website and add the following **Apache directives** under "Options" → "Apache Directives":
   ```apache
   ProxyPreserveHost On
   RequestHeader set X-Forwarded-Proto expr=%{REQUEST_SCHEME}

   ProxyPass "/api/" "http://127.0.0.1:50001/"
   ProxyPassReverse "/api/" "http://127.0.0.1:50001/"

   ProxyPass "/ws/"  "ws://127.0.0.1:50001/ws/"
   ProxyPassReverse "/ws/"  "ws://127.0.0.1:50001/ws/"

   ProxyPass "/" "http://127.0.0.1:3000/"
   ProxyPassReverse "/" "http://127.0.0.1:3000/"
   ```

### Nginx directives

In ISPConfig, edit the website and add the following **nginx directives** in the "Options" → "nginx Directives" box:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:50001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ws/ {
    proxy_pass http://127.0.0.1:50001/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Save the website changes and let ISPConfig reload the service.

## 7. Issue HTTPS certificates

After the site resolves to your server, revisit the website in ISPConfig and enable the **Let's Encrypt SSL** checkbox. Save the form; ISPConfig will provision the certificate and reload the web server automatically. Verify with:

```bash
curl -I https://chat.example.com
```

If you use separate subdomains for API and frontend, enable SSL on each.

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
   sudo -u webX NEXT_PUBLIC_API_BASE_URL=https://chat.example.com/api pnpm build
   sudo -u webX pnpm next export --outdir ../dist
   ```
   Update the ISPConfig website to serve the static `dist` directory and proxy `/api` as above.

## 10. Backups and monitoring

- Use ISPConfig's backup features or schedule cron jobs to archive `/var/www/clients/clientX/webY/app/backend/data` (SQLite) and `.env` files.
- Monitor services with `systemctl status`, `journalctl`, or integrate with external monitoring tools.
- Configure firewall rules (e.g., UFW) to allow only necessary ports (80, 443, SSH, TURN if applicable).

Following these steps will deploy ChatOrbit under ISPConfig while keeping ownership and permissions aligned with the panel, enabling HTTPS, and providing a reproducible update path.
