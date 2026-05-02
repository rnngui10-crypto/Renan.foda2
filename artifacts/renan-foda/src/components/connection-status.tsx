import { useGetConnectionStatus, useConnectIqOption, getGetConnectionStatusQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function ConnectionStatus() {
  const { data: status, isLoading } = useGetConnectionStatus({
    query: {
      queryKey: getGetConnectionStatusQueryKey(),
      refetchInterval: 30000,
    }
  });
  
  const connect = useConnectIqOption();
  const queryClient = useQueryClient();

  const handleConnect = () => {
    connect.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetConnectionStatusQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border px-3 py-2 rounded-md">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Verificando conexão...
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="flex items-center justify-between gap-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          Desconectado da IQ Option
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleConnect}
          disabled={connect.isPending}
          className="border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
        >
          {connect.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Conectar Agora
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border px-4 py-3 rounded-md">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Conectado ({status.accountType})
          </span>
          {status.email && <span className="text-xs text-muted-foreground">{status.email}</span>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {status.balance !== undefined && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Saldo Atual</div>
            <div className="text-lg font-mono font-bold text-foreground">
              {status.currency} {status.balance.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
