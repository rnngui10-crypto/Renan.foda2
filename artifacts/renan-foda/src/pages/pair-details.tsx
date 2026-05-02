import { useParams, Link } from "wouter";
import { useGetPairSignal, useGetCandles, getGetPairSignalQueryKey, getGetCandlesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalBadge } from "@/components/signal-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Activity, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function PairDetails() {
  const { pair } = useParams<{ pair: string }>();
  
  const { data: signalData, isLoading: isLoadingSignal } = useGetPairSignal(
    pair!,
    {},
    {
      query: {
        enabled: !!pair,
        queryKey: getGetPairSignalQueryKey(pair!),
        refetchInterval: 60000,
      }
    }
  );

  const { data: candlesData, isLoading: isLoadingCandles } = useGetCandles(
    pair!,
    { timeframe: 60, count: 50 },
    {
      query: {
        enabled: !!pair,
        queryKey: getGetCandlesQueryKey(pair!, { timeframe: 60, count: 50 }),
        refetchInterval: 60000,
      }
    }
  );

  const chartData = candlesData?.candles?.map(c => ({
    time: new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: c.close
  })) || [];

  if (isLoadingSignal) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Analisando ativo...</div>;
  }

  if (!signalData) {
    return <div className="p-8 text-center text-muted-foreground">Erro ao carregar dados do par.</div>;
  }

  const { signal, indicators } = signalData;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sinais">
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">{signal.displayName}</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">{signal.type} MARKET</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground uppercase">Preço Atual</div>
            <div className="font-mono font-bold text-xl">{indicators.currentPrice.toFixed(5)}</div>
          </div>
          <SignalBadge signal={signal.signal} className="text-lg px-4 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" /> Ação Recomendada
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-8">
              <div className="text-center md:text-left flex-1">
                <div className="text-6xl font-black font-mono tracking-tighter mb-2">
                  <span className={
                    signal.signal === "CALL" ? "text-[hsl(var(--call))]" :
                    signal.signal === "PUT" ? "text-[hsl(var(--put))]" : "text-muted-foreground"
                  }>{signal.confidence}%</span>
                </div>
                <p className="text-muted-foreground uppercase text-xs font-semibold tracking-wider">Grau de Confiança</p>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground text-sm">Entrada</span>
                  <span className="font-medium font-mono text-sm flex items-center gap-1.5">
                    {signal.entryType === "mesma_vela" ? <Zap className="w-3.5 h-3.5 text-yellow-500"/> : <Clock className="w-3.5 h-3.5"/>}
                    {signal.entryType.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground text-sm">Timeframe</span>
                  <span className="font-medium font-mono text-sm">M{signal.timeframe / 60}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Payout</span>
                  <span className="font-medium font-mono text-sm text-green-500">{signal.profitPercent || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Ação do Preço (1m)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                {isLoadingCandles ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                    Carregando gráfico...
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickMargin={10} minTickGap={30} />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickFormatter={(val) => val.toFixed(4)}
                        width={60}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                        formatter={(val: number) => [val.toFixed(5), 'Preço']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke={signal.signal === "CALL" ? "hsl(var(--call))" : signal.signal === "PUT" ? "hsl(var(--put))" : "hsl(var(--primary))"} 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados suficientes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Indicadores Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">RSI (14)</span>
                <span className={`font-mono text-sm font-medium ${(indicators.rsi || 0) > 70 ? 'text-[hsl(var(--put))]' : (indicators.rsi || 0) < 30 ? 'text-[hsl(var(--call))]' : ''}`}>
                  {indicators.rsi?.toFixed(2) || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">MACD</span>
                <span className="font-mono text-sm font-medium">{indicators.macd?.toFixed(5) || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Stoch K</span>
                <span className="font-mono text-sm font-medium">{indicators.stochK?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Stoch D</span>
                <span className="font-mono text-sm font-medium">{indicators.stochD?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">EMA 9</span>
                <span className="font-mono text-sm font-medium">{indicators.ema9?.toFixed(5) || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">EMA 21</span>
                <span className="font-mono text-sm font-medium">{indicators.ema21?.toFixed(5) || '-'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Voto das Estratégias</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {signal.strategies.map((strat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{strat.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{strat.description}</span>
                  </div>
                  <SignalBadge signal={strat.signal} showIcon={false} className="h-6" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
