FROM node:20-bookworm

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "--port", "3000", "--hostname", "0.0.0.0"]
