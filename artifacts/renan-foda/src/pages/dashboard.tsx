import { useState, useEffect, useCallback } from "react";
import {
  useGetPairSignal,
  useConnectIqOption,
  useGetConnectionStatus,
  getGetConnectionStatusQueryKey,
  getGetPairSignalQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Wifi,
  WifiOff,
  Minus,
  ChevronDown,
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

const ALL_PAIRS = [
  ...OTC_PAIRS.map((p) => ({ value: p, label: p.replace("-OTC", " OTC"), group: "OTC" })),
  ...OPEN_PAIRS.map((p) => ({ value: p, label: p, group: "ABERTO" })),
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

function PairSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = ALL_PAIRS.find((p) => p.value === value);

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-[#070b12] border border-[#1a2332] rounded-lg px-3 h-10 text-white font-mono font-bold text-sm hover:border-[#2a3342] transition-colors"
      >
        <span>{current?.label ?? value}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-11 z-50 w-56 bg-[#0d1420] border border-[#1a2332] rounded-xl shadow-2xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold bg-[#070b12]">
                — OTC —
              </div>
              {OTC_PAIRS.map((p) => (
                <button
                  key={p}
                  onClick={() => { onChange(p); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm font-mono text-white hover:bg-[#1a2332] transition-colors",
                    value === p && "bg-[#1a2332] text-blue-400"
                  )}
                >
                  {p.replace("-OTC", " OTC")}
                </button>
              ))}
              <div className="px-3 py-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold bg-[#070b12] mt-1">
                — ABERTO —
              </div>
              {OPEN_PAIRS.map((p) => (
                <button
                  key={p}
                  onClick={() => { onChange(p); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm font-mono text-white hover:bg-[#1a2332] transition-colors",
                    value === p && "bg-[#1a2332] text-blue-400"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [selectedPair, setSelectedPair] = useState("EURUSD-OTC");
  const [timeframe, setTimeframe] = useState(60);
  const [tfOpen, setTfOpen] = useState(false);
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
        staleTime: 0,
      },
    }
  );

  const connect = useConnectIqOption();

  const handlePairChange = useCallback((pair: string) => {
    setSelectedPair(pair);
    queryClient.removeQueries({
      queryKey: getGetPairSignalQueryKey(pair, { timeframe }),
    });
  }, [queryClient, timeframe]);

  const handleTimeframeChange = useCallback((tf: number) => {
    setTimeframe(tf);
    queryClient.removeQueries({
      queryKey: getGetPairSignalQueryKey(selectedPair, { timeframe: tf }),
    });
  }, [queryClient, selectedPair]);

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

  const tfLabels: Record<number, string> = { 60: "M1", 300: "M5", 900: "M15" };

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
          <PairSelector value={selectedPair} onChange={handlePairChange} />

          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={() => setTfOpen((o) => !o)}
              className="flex items-center justify-between gap-1 bg-[#070b12] border border-[#1a2332] rounded-lg px-3 h-10 text-white font-mono font-bold text-sm w-[72px] hover:border-[#2a3342] transition-colors"
            >
              <span>{tfLabels[timeframe]}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-gray-500 transition-transform", tfOpen && "rotate-180")} />
            </button>
            {tfOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTfOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-20 bg-[#0d1420] border border-[#1a2332] rounded-xl shadow-2xl overflow-hidden">
                  {[{ value: 60, label: "M1" }, { value: 300, label: "M5" }, { value: 900, label: "M15" }].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => { handleTimeframeChange(value); setTfOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-sm font-mono text-white hover:bg-[#1a2332] transition-colors",
                        timeframe === value && "bg-[#1a2332] text-blue-400"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
                isCall && "bg-green-500/10 border-2 border-green-500/60 shadow-[0_0_24px_rgba(34,197,94,0.15)]",
                isPut && "bg-red-500/10 border-2 border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.15)]",
                isNeutral && "bg-[#111827] border border-[#1a2332]"
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
              <span className={cn("font-mono font-bold text-base", isCall ? "text-green-400" : "text-red-400")}>
                {signal.confidence}% confiança
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                {signal.entryType === "mesma_vela" ? (
                  <><Zap className="w-3 h-3 text-yellow-500" /> Mesma Vela</>
                ) : (
                  <><Clock className="w-3 h-3" /> Próxima Vela</>
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
            <div key={label} className="py-4 text-center border-r border-[#1a2332] last:border-r-0">
              <div className="text-2xl font-black font-mono text-white tabular-nums">{value}</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mt-1 font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategies Breakdown */}
      {signal?.strategies && signal.strategies.length > 0 && (
        <div className="w-full max-w-sm mt-3 bg-[#0d1420] border border-[#1a2332] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1a2332] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              Estratégias
            </span>
            <span className="text-[10px] text-gray-600">
              {(signal.strategies as any[]).filter((s) => s.signal === "CALL").length} compra ·{" "}
              {(signal.strategies as any[]).filter((s) => s.signal === "PUT").length} venda ·{" "}
              {(signal.strategies as any[]).filter((s) => s.signal === "NEUTRO").length} neutro
            </span>
          </div>
          <div className="divide-y divide-[#1a2332]">
            {(signal.strategies as any[]).map((s, i) => {
              const isStratCall = s.signal === "CALL";
              const isStratPut = s.signal === "PUT";
              const strength = Math.min(100, Math.max(0, s.strength ?? 0));
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-bold">{s.name}</span>
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2 py-0.5 rounded font-mono",
                          isStratCall && "bg-green-500/15 text-green-400",
                          isStratPut && "bg-red-500/15 text-red-400",
                          !isStratCall && !isStratPut && "bg-gray-500/10 text-gray-500"
                        )}
                      >
                        {isStratCall ? "COMPRA" : isStratPut ? "VENDA" : "NEUTRO"}
                      </span>
                    </div>
                    {strength > 0 && (
                      <span className={cn(
                        "text-xs font-mono font-bold",
                        isStratCall ? "text-green-400" : isStratPut ? "text-red-400" : "text-gray-500"
                      )}>
                        {strength}%
                      </span>
                    )}
                  </div>
                  {/* Força da estratégia */}
                  {strength > 0 && (
                    <div className="w-full h-1 bg-[#1a2332] rounded-full overflow-hidden mb-1.5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isStratCall ? "bg-green-500" : isStratPut ? "bg-red-500" : "bg-gray-600"
                        )}
                        style={{ width: `${strength}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">{s.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signal History */}
      {history.length > 0 && (
        <div className="w-full max-w-sm mt-3 bg-[#0d1420] border border-[#1a2332] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1a2332] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Histórico</span>
            <button
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              onClick={() => { setHistory([]); saveHistory([]); setSignalCount(0); }}
            >
              limpar
            </button>
          </div>
          <div className="divide-y divide-[#1a2332]">
            {history.slice(0, 10).map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-bold text-white truncate">{item.pair}</span>
                  <span className="font-mono text-xs text-gray-600">{item.price.toFixed(5)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-600">{item.time}</span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded font-mono",
                      item.signal === "CALL" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
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
