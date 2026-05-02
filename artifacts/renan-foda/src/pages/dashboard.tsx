import { useGetSignalStats, getGetSignalStatsQueryKey } from "@workspace/api-client-react";
import { ConnectionStatus } from "@/components/connection-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowUpRight, ArrowDownRight, Zap, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalBadge } from "@/components/signal-badge";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetSignalStats({
    query: {
      queryKey: getGetSignalStatsQueryKey(),
      refetchInterval: 60000,
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Visão Geral</h1>
        <p className="text-muted-foreground">Monitoramento em tempo real do mercado e sinais da IA.</p>
      </div>

      <ConnectionStatus />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-1" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Sinais</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{stats.totalSignals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gerados recentemente
                </p>
              </CardContent>
            </Card>
            <Card className="border-[hsl(var(--call))/0.3] relative overflow-hidden group">
              <div className="absolute inset-0 bg-[hsl(var(--call))/0.05] pointer-events-none group-hover:bg-[hsl(var(--call))/0.1] transition-colors" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sinais CALL</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-[hsl(var(--call))]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-[hsl(var(--call))]">{stats.callCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tendência de alta
                </p>
              </CardContent>
            </Card>
            <Card className="border-[hsl(var(--put))/0.3] relative overflow-hidden group">
              <div className="absolute inset-0 bg-[hsl(var(--put))/0.05] pointer-events-none group-hover:bg-[hsl(var(--put))/0.1] transition-colors" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sinais PUT</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-[hsl(var(--put))]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-[hsl(var(--put))]">{stats.putCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tendência de baixa
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Alta Confiança</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-primary">{stats.strongSignals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sinais &ge; 70%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Top Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topPairs.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">Nenhum sinal forte no momento.</div>
                  ) : (
                    stats.topPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                        <div className="font-mono font-bold">{pair.pair}</div>
                        <div className="flex items-center gap-4">
                          <SignalBadge signal={pair.signal} />
                          <div className="font-mono text-sm px-2 py-1 bg-primary/10 text-primary rounded font-medium">
                            {pair.confidence}%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Estratégia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.strategyBreakdown || {}).length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">Sem dados de estratégias.</div>
                  ) : (
                    Object.entries(stats.strategyBreakdown).map(([strategy, count], idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground font-medium">{strategy}</div>
                        <div className="font-mono text-sm">{count}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
