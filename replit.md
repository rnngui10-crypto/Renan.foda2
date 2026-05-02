# Workspace — renan.foda

## Overview

pnpm workspace monorepo com TypeScript. Painel de sinais de trading para IQ Option com IA de análise técnica.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS (tema dark)

## Artifacts

### renan-foda (frontend — `/`)
Painel de sinais de trading com:
- Dashboard com estatísticas globais, top oportunidades, distribuição por estratégia
- Página de sinais com tabela filtrável (OTC/aberto, timeframe, força)
- Detalhe de par com indicadores técnicos e mini-gráfico de velas
- Status de conexão IQ Option com botão de reconectar

### api-server (`/api`)
Backend Express com integração Python IQ Option:
- `POST /api/iqoption/connect` — conecta à IQ Option (conta REAL)
- `GET /api/iqoption/status` — status da conexão
- `GET /api/iqoption/pairs` — lista todos os pares OTC e mercado aberto
- `GET /api/iqoption/signals` — sinais CALL/PUT para todos os pares
- `GET /api/iqoption/signals/:pair` — análise detalhada de um par
- `GET /api/iqoption/candles/:pair` — dados históricos de velas
- `GET /api/iqoption/account` — informações da conta real
- `GET /api/iqoption/stats` — estatísticas globais dos sinais

## Estratégias de Análise Técnica

O script Python (`artifacts/api-server/src/lib/iqoption_service.py`) implementa:
1. **RSI** (Índice de Força Relativa) — oversold/overbought
2. **MACD** — cruzamento de linhas e divergências
3. **Bollinger Bands** — rompimento e reversão
4. **EMA Crossover** — cruzamento das médias 9/21
5. **Estocástico** — reversões em extremos

## Credenciais IQ Option

Armazenadas como segredos: `IQOPTION_EMAIL` e `IQOPTION_PASSWORD`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/api-server run build` — build API server
- `python3 artifacts/api-server/src/lib/iqoption_service.py signals` — testar sinais direto
