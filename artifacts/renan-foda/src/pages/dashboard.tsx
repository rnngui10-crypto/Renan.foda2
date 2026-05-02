import { useState, useEffect, useCallback } from "react";
import {
  useGetPairSignal,
  useConnectIqOption,
  useGetConnectionStatus,
  getGetConnectionStatusQueryKey,
  getGetPairSignalQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Wifi,
  WifiOff,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OTC_PAIRS = [
  "EURUSD-OTC", "EURGBP-OTC", "EURJPY-OTC", "EURCAD-OTC", "EURAUD-OTC",
  "GBPUSD-OTC", "GBPJPY-OTC", "GBPCHF-OTC", "GBPCAD-OTC",
  "USDJPY-OTC", "USDCHF-OTC", "USDCAD-OTC",
  "AUDUSD-OTC", "AUDJPY-OTC", "AUDCAD-OTC", "AUDCHF-OTC", "AUDNZD-OTC",
  "NZDUSD-OTC", "NZDJPY-OTC",
  "CHFJPY-OTC", "CADJPY-OTC", "CADCHF-OTC",
  "XAUUSD-OTC", "XAGUSD-OTC",
];

const OPEN_PAIRS = [
  "EURUSD", "EURGBP", "EURJPY", "GBPUSD", "GBPJPY",
  "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "AUDJPY",
  "NZDUSD", "CHFJPY", "XAUUSD", "XAGUSD",
];

interface HistoryItem {
  id: string;
  pair: string;
  price: number;
  signal: "CALL" | "PUT";
  confidence: number;
  time: string;
  entryType: string;
}

const STORAGE_KEY = "renan_foda_history_v2";

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

export default function Dashboard() {
  const [selectedPair, setSelectedPair] = useState("EURUSD-OTC");
  const [timeframe, setTimeframe] = useState(60);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [signalCount, setSignalCount] = useState(0);
  const [lastSignalId, setLastSignalId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: statusData } = useGetConnectionStatus({
    query: {
      queryKey: getGetConnectionStatusQueryKey(),
      refetchInterval: 30000,
    },
  });

  const { data: signalData, isLoading, refetch } = useGetPairSignal(
    selectedPair,
    { timeframe },
    {
      query: {
        enabled: !!selectedPair,
        queryKey: getGetPairSignalQueryKey(selectedPair, { timeframe }),
        refetchInterval: 30000,
      },
    }
  );

  const connect = useConnectIqOption();

  useEffect(() => {
    if (signalData?.signal && signalData.signal.signal !== "NEUTRO") {
      const sig = signalData.signal;
      const id = `${sig.pair}-${sig.timestamp}`;
      if (id === lastSignalId) return;
      setLastSignalId(id);

      const newItem: HistoryItem = {
        id,
        pair: sig.displayName || sig.pair,
        price: signalData.indicators?.currentPrice ?? 0,
        signal: sig.signal as "CALL" | "PUT",
        confidence: sig.confidence,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        entryType: sig.entryType,
      };

      setHistory((prev) => {
        if (prev.some((h) => h.id === newItem.id)) return prev;
        const updated = [newItem, ...prev];
        saveHistory(updated);
        return updated;
      });
      setSignalCount((c) => c + 1);
    }
  }, [signalData, lastSignalId]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getGetPairSignalQueryKey(selectedPair, { timeframe }),
    });
    refetch();
  }, [queryClient, selectedPair, timeframe, refetch]);

  const handleConnect = () => {
    connect.mutate(undefined, {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetConnectionStatusQueryKey() }),
    });
  };

  const signal = signalData?.signal;
  const indicators = signalData?.indicators;
  const isConnected = statusData?.connected;
  const isCall = signal?.signal === "CALL";
  const isPut = signal?.signal === "PUT";
  const isNeutral = !signal || signal.signal === "NEUTRO";

  const winRate =
    history.length === 0
      ? null
      : Math.round((history.filter((h) => h.confidence >= 60).length / history.length) * 100);

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex flex-col items-center py-6 px-4">

      {/* Logo + Connection Header */}
      <div className="w-full max-w-sm mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-mono font-black text-lg tracking-[0.2em] uppercase text-white">
            RENAN.FODA
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
            IA de Sinais IQ Option
          </p>
        </div>
        <div>
          {isConnected ? (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-green-400 font-medium">Conectado</span>
            </div>
          ) : (
            <Button
              size="sm"
              className="h-8 text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-full px-3"
              variant="ghost"
              onClick={handleConnect}
              disabled={connect.isPending}
            >
              {connect.isPending ? (
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1.5" />
              )}
              Conectar IQ
            </Button>
          )}
        </div>
      </div>

      {isConnected && statusData?.balance !== undefined && (
        <div className="w-full max-w-sm mb-4 flex items-center justify-between bg-[#0d1420] border border-[#1a2332] rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-gray-400">{statusData.email}</span>
          </div>
          <span className="font-mono text-sm font-bold text-white">
            {statusData.currency} {statusData.balance.toFixed(2)}
          </span>
        </div>
      )}

      {/* Main Panel */}
      <div className="w-full max-w-sm bg-[#0d1420] border border-[#1a2332] rounded-2xl overflow-hidden shadow-2xl">

        {/* Pair + Timeframe Selectors */}
        <div className="p-3 border-b border-[#1a2332] flex gap-2">
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="flex-1 bg-[#070b12] border-[#1a2332] text-white font-mono font-bold text-sm h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1420] border-[#1a2332] max-h-[280px]">
              <div className="px-2 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                — OTC —
              </div>
              {OTC_PAIRS.map((p) => (
                <SelectItem
                  key={p}
                  value={p}
                  className="text-white data-[highlighted]:bg-[#1a2332] font-mono text-sm"
                >
                  {p.replace("-OTC", " OTC")}
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-1">
                — ABERTO —
              </div>
              {OPEN_PAIRS.map((p) => (
                <SelectItem
                  key={p}
                  value={p}
                  className="text-white data-[highlighted]:bg-[#1a2332] font-mono text-sm"
                >
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeframe.toString()} onValueChange={(v) => setTimeframe(Number(v))}>
            <SelectTrigger className="w-[72px] bg-[#070b12] border-[#1a2332] text-white font-mono font-bold text-sm h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1420] border-[#1a2332]">
              {[
                { value: "60", label: "M1" },
                { value: "300", label: "M5" },
                { value: "900", label: "M15" },
              ].map(({ value, label }) => (
                <SelectItem
                  key={value}
                  value={value}
                  className="text-white data-[highlighted]:bg-[#1a2332] font-mono"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Display */}
        <div className="px-4 pt-4 pb-2 flex items-end justify-between">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço</div>
            <div className="text-2xl font-mono font-black text-white tabular-nums">
              {indicators?.currentPrice ? indicators.currentPrice.toFixed(5) : "—.—————"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:text-gray-300 mb-0.5"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Signal Button */}
        <div className="px-4 pb-4 pt-2">
          {isLoading ? (
            <div className="h-[88px] rounded-xl bg-[#111827] border border-[#1a2332] flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
              <span className="text-sm text-gray-600">Analisando...</span>
            </div>
          ) : (
            <div
              className={cn(
                "h-[88px] rounded-xl flex items-center justify-center gap-4 select-none",
                isCall &&
                  "bg-green-500/10 border-2 border-green-500/60 shadow-[0_0_24px_rgba(34,197,94,0.15)]",
                isPut &&
                  "bg-red-500/10 border-2 border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]",
                isNeutral &&
                  "bg-[#111827] border border-[#1a2332]"
              )}
            >
              {isCall && <TrendingUp className="w-9 h-9 text-green-400" />}
              {isPut && <TrendingDown className="w-9 h-9 text-red-400" />}
              {isNeutral && <Minus className="w-7 h-7 text-gray-600" />}
              <span
                className={cn(
                  "text-4xl font-black tracking-widest",
                  isCall && "text-green-400",
                  isPut && "text-red-400",
                  isNeutral && "text-gray-600"
                )}
              >
                {isCall ? "COMPRA" : isPut ? "VENDA" : "NEUTRO"}
              </span>
            </div>
          )}

          {signal && !isNeutral && (
            <div className="mt-2.5 flex items-center justify-center gap-3">
              <span
                className={cn(
                  "font-mono font-bold text-base",
                  isCall ? "text-green-400" : "text-red-400"
                )}
              >
                {signal.confidence}% confiança
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                {signal.entryType === "mesma_vela" ? (
                  <>
                    <Zap className="w-3 h-3 text-yellow-500" /> Mesma Vela
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" /> Próxima Vela
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 border-t border-[#1a2332]">
          {[
            { label: "SINAL", value: signalCount },
            { label: "HISTÓRICO", value: history.length },
            { label: "RENDIMENTO", value: winRate !== null ? `${winRate}%` : "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="py-4 text-center border-r border-[#1a2332] last:border-r-0"
            >
              <div className="text-2xl font-black font-mono text-white tabular-nums">
                {value}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mt-1 font-semibold">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategies Breakdown */}
      {signal?.strategies && signal.strategies.length > 0 && (
        <div className="w-full max-w-sm mt-3 bg-[#0d1420] border border-[#1a2332] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1a2332]">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              Estratégias
            </span>
          </div>
          <div className="divide-y divide-[#1a2332]">
            {(signal.strategies as any[]).map((s, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm text-white font-medium">{s.name}</span>
                  <span className="text-[11px] text-gray-500 ml-2 truncate">{s.description}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-mono shrink-0",
                    s.signal === "CALL"
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : s.signal === "PUT"
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                  )}
                >
                  {s.signal}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signal History */}
      {history.length > 0 && (
        <div className="w-full max-w-sm mt-3 bg-[#0d1420] border border-[#1a2332] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1a2332] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              Histórico
            </span>
            <button
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              onClick={() => {
                setHistory([]);
                saveHistory([]);
                setSignalCount(0);
              }}
            >
              limpar
            </button>
          </div>
          <div className="divide-y divide-[#1a2332]">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-bold text-white truncate">
                    {item.pair}
                  </span>
                  <span className="font-mono text-xs text-gray-600 hidden sm:inline">
                    {item.price.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-600">{item.time}</span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded font-mono",
                      item.signal === "CALL"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                    )}
                  >
                    {item.signal === "CALL" ? "COMPRA" : "VENDA"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
