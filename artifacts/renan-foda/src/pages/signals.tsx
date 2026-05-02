import { useState } from "react";
import { useGetAllSignals, getGetAllSignalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { SignalBadge } from "@/components/signal-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Zap, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Signals() {
  const [timeframe, setTimeframe] = useState<number | undefined>(undefined);
  const [type, setType] = useState<"all" | "otc" | "open">("all");

  const { data: response, isLoading } = useGetAllSignals(
    { timeframe, type: type === "all" ? undefined : type },
    {
      query: {
        queryKey: getGetAllSignalsQueryKey({ timeframe, type: type === "all" ? undefined : type }),
        refetchInterval: 60000,
      }
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sinais</h1>
          <p className="text-muted-foreground">Monitoramento completo de todas as oportunidades.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe?.toString() || "all"} onValueChange={(v) => setTimeframe(v === "all" ? undefined : Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="60">M1 (1m)</SelectItem>
              <SelectItem value="300">M5 (5m)</SelectItem>
              <SelectItem value="900">M15 (15m)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Mercado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="otc">OTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead>Sinal</TableHead>
                <TableHead className="text-center">Confiança</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Carregando sinais...
                  </TableCell>
                </TableRow>
              ) : !response?.signals || response.signals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum sinal encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                response.signals.map((signal, i) => (
                  <TableRow key={i} className={signal.confidence >= 70 ? "bg-primary/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{signal.displayName}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {signal.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SignalBadge signal={signal.signal} />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono font-bold ${signal.confidence >= 70 ? 'text-primary' : ''}`}>
                        {signal.confidence}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {signal.entryType === "mesma_vela" ? (
                          <><Zap className="w-3.5 h-3.5 text-yellow-500" /> Mesma Vela</>
                        ) : (
                          <><Clock className="w-3.5 h-3.5" /> Próxima</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">M{signal.timeframe / 60}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {signal.profitPercent ? (
                        <span className="text-green-500 font-mono font-medium">{signal.profitPercent}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/par/${signal.pair}`}>
                        <Button variant="ghost" size="sm" className="h-8">
                          Analisar
                          <ExternalLink className="w-3.5 h-3.5 ml-2" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
