import { useState } from "react";
import { useGetTradingPairs, getGetTradingPairsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Pairs() {
  const { data: response, isLoading } = useGetTradingPairs(
    {},
    {
      query: {
        queryKey: getGetTradingPairsQueryKey({}),
        refetchInterval: 120000,
      }
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pares de Trading</h1>
        <p className="text-muted-foreground">Lista de todos os ativos disponíveis na corretora.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Pares</div>
            <div className="text-2xl font-mono font-bold">{response?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Mercado Aberto</div>
            <div className="text-2xl font-mono font-bold text-green-500">{response?.openCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Mercado OTC</div>
            <div className="text-2xl font-mono font-bold text-orange-500">{response?.otcCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Payout Atual</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Carregando pares...
                  </TableCell>
                </TableRow>
              ) : !response?.pairs || response.pairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum par encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                response.pairs.map((pair, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span className="font-mono font-bold">{pair.displayName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pair.type === "otc" ? "secondary" : "outline"} className="uppercase text-[10px]">
                        {pair.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${pair.isOpen ? 'bg-green-500' : 'bg-destructive'}`} />
                        <span className="text-xs text-muted-foreground">
                          {pair.isOpen ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {pair.profitPercent ? (
                        <span className="text-green-500 font-mono font-medium">{pair.profitPercent}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/par/${pair.name}`}>
                        <Button variant="ghost" size="sm" className="h-8">
                          Detalhes
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
