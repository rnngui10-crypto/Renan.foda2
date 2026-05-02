FROM node:20-slim

# Instala Python3 + pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Instala dependências Python para o serviço IQ Option
RUN pip3 install requests websocket-client --break-system-packages

# Instala pnpm (mesma versão do projeto)
RUN npm install -g pnpm@10

WORKDIR /app

# Copia arquivos do workspace
COPY . .

# Instala dependências Node.js
RUN pnpm install --no-frozen-lockfile

# Build do frontend (BASE_PATH=/ para produção, PORT apenas para satisfazer o config)
RUN BASE_PATH=/ PORT=3000 pnpm --filter @workspace/renan-foda run build

# Build do servidor API
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
