FROM node:20-slim

RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

RUN pip3 install requests websocket-client --break-system-packages

WORKDIR /app

# Copia o servidor API já buildado
COPY artifacts/api-server/dist ./artifacts/api-server/dist

# Copia o script Python (chamado em runtime pelo servidor)
COPY artifacts/api-server/src/lib/iqoption_service.py ./artifacts/api-server/src/lib/iqoption_service.py

# Copia o frontend já buildado
COPY artifacts/renan-foda/dist/public ./artifacts/renan-foda/dist/public

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
