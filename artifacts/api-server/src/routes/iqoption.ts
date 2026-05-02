import { Router, type IRouter } from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import {
  ConnectIqOptionResponse,
  GetConnectionStatusResponse,
  GetTradingPairsResponse,
  GetAllSignalsResponse,
  GetPairSignalResponse,
  GetCandlesResponse,
  GetAccountInfoResponse,
  GetSignalStatsResponse,
  GetTradingPairsQueryParams,
  GetAllSignalsQueryParams,
  GetPairSignalParams,
  GetPairSignalQueryParams,
  GetCandlesParams,
  GetCandlesQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = path.resolve(__dirname, "../src/lib/iqoption_service.py");

function runPython(args: string[], timeoutMs = 30000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [PYTHON_SCRIPT, ...args], {
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Timeout no serviço Python"));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger.warn({ code, stderr }, "Python saiu com erro");
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        reject(new Error(`Saída inválida do Python: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Cache simples em memória
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// POST /iqoption/connect
router.post("/iqoption/connect", async (req, res): Promise<void> => {
  req.log.info("Conectando à IQ Option...");
  try {
    const data = await runPython(["connect"], 30000);
    const parsed = ConnectIqOptionResponse.parse(data);
    if (parsed.connected) {
      setCache("status", parsed, 60000);
    }
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Erro ao conectar");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

// GET /iqoption/status
router.get("/iqoption/status", async (req, res): Promise<void> => {
  const cached = getCache("status");
  if (cached) {
    res.json(GetConnectionStatusResponse.parse(cached));
    return;
  }
  try {
    const data = await runPython(["connect"], 30000);
    const parsed = GetConnectionStatusResponse.parse(data);
    setCache("status", parsed, 60000);
    res.json(parsed);
  } catch (err) {
    req.log.warn({ err }, "Não conectado");
    res.json({ connected: false, message: "Não conectado" });
  }
});

// GET /iqoption/pairs
router.get("/iqoption/pairs", async (req, res): Promise<void> => {
  const query = GetTradingPairsQueryParams.safeParse(req.query);
  const pairType = query.success ? (query.data.type ?? "all") : "all";
  const cacheKey = `pairs_${pairType}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.json(GetTradingPairsResponse.parse(cached));
    return;
  }
  try {
    const data = await runPython(["pairs", "--type", pairType], 20000);
    const parsed = GetTradingPairsResponse.parse(data);
    setCache(cacheKey, parsed, 300000); // 5 min
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar pares");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

// GET /iqoption/signals
router.get("/iqoption/signals", async (req, res): Promise<void> => {
  const query = GetAllSignalsQueryParams.safeParse(req.query);
  const timeframe = query.success ? String(query.data.timeframe ?? 60) : "60";
  const pairType = query.success ? (query.data.type ?? "all") : "all";
  const cacheKey = `signals_${timeframe}_${pairType}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.json(GetAllSignalsResponse.parse(cached));
    return;
  }
  req.log.info({ timeframe, pairType }, "Gerando sinais...");
  try {
    const data = await runPython(
      ["signals", "--timeframe", timeframe, "--type", pairType],
      60000
    );
    const parsed = GetAllSignalsResponse.parse(data);
    setCache(cacheKey, parsed, 60000); // 1 min
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Erro ao gerar sinais");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

// GET /iqoption/signals/:pair
router.get("/iqoption/signals/:pair", async (req, res): Promise<void> => {
  const rawPair = Array.isArray(req.params.pair)
    ? req.params.pair[0]
    : req.params.pair;
  const params = GetPairSignalParams.safeParse({ pair: rawPair });
  if (!params.success) {
    res.status(400).json({ error: "Par inválido", message: params.error.message });
    return;
  }
  const query = GetPairSignalQueryParams.safeParse(req.query);
  const timeframe = String(query.success ? (query.data.timeframe ?? 60) : 60);
  const cacheKey = `signal_${params.data.pair}_${timeframe}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.json(GetPairSignalResponse.parse(cached));
    return;
  }
  try {
    const data = await runPython(
      ["signal", "--pair", params.data.pair, "--timeframe", timeframe],
      30000
    );
    const parsed = GetPairSignalResponse.parse(data);
    setCache(cacheKey, parsed, 60000);
    res.json(parsed);
  } catch (err) {
    req.log.error({ err, pair: params.data.pair }, "Erro ao analisar par");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

// GET /iqoption/candles/:pair
router.get("/iqoption/candles/:pair", async (req, res): Promise<void> => {
  const rawPair = Array.isArray(req.params.pair)
    ? req.params.pair[0]
    : req.params.pair;
  const params = GetCandlesParams.safeParse({ pair: rawPair });
  if (!params.success) {
    res.status(400).json({ error: "Par inválido", message: params.error.message });
    return;
  }
  const query = GetCandlesQueryParams.safeParse(req.query);
  const timeframe = String(query.success ? (query.data.timeframe ?? 60) : 60);
  const count = String(query.success ? (query.data.count ?? 100) : 100);
  const cacheKey = `candles_${params.data.pair}_${timeframe}_${count}`;
  const cached = getCache(cacheKey);
  if (cached) {
    res.json(GetCandlesResponse.parse(cached));
    return;
  }
  try {
    const data = await runPython(
      ["candles", "--pair", params.data.pair, "--timeframe", timeframe, "--count", count],
      20000
    );
    const parsed = GetCandlesResponse.parse(data);
    setCache(cacheKey, parsed, 60000);
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar velas");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

// GET /iqoption/account
router.get("/iqoption/account", async (req, res): Promise<void> => {
  const cached = getCache("account");
  if (cached) {
    res.json(GetAccountInfoResponse.parse(cached));
    return;
  }
  try {
    const data = await runPython(["account"], 30000);
    const parsed = GetAccountInfoResponse.parse(data);
    setCache("account", parsed, 30000);
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar conta");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

// GET /iqoption/stats
router.get("/iqoption/stats", async (req, res): Promise<void> => {
  const cached = getCache("stats");
  if (cached) {
    res.json(GetSignalStatsResponse.parse(cached));
    return;
  }
  try {
    const data = await runPython(["stats"], 60000);
    const parsed = GetSignalStatsResponse.parse(data);
    setCache("stats", parsed, 120000); // 2 min
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar stats");
    res.status(500).json({ error: "Erro interno", message: String(err) });
  }
});

export default router;
