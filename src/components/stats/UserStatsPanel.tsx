import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useUserStats } from "@/hooks/useUserStats";
import { Hash, MessageCircle, Users, BarChart3 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function UserStatsPanel({ open, onOpenChange }: Props) {
  const { data, isLoading } = useUserStats(30);

  const max = Math.max(1, ...(data?.byDay.map((d) => d.count) || [1]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Suas estatísticas (30 dias)
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 rounded-xl text-center">
                <Hash className="h-4 w-4 mx-auto text-blue-500" />
                <div className="text-2xl font-bold mt-1">{data?.channelMessages ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Canais</div>
              </Card>
              <Card className="p-3 rounded-xl text-center">
                <MessageCircle className="h-4 w-4 mx-auto text-green-500" />
                <div className="text-2xl font-bold mt-1">{data?.dmMessages ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">DMs</div>
              </Card>
              <Card className="p-3 rounded-xl text-center">
                <Users className="h-4 w-4 mx-auto text-purple-500" />
                <div className="text-2xl font-bold mt-1">{data?.groupMessages ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Grupos</div>
              </Card>
            </div>

            <Card className="p-4 rounded-xl">
              <div className="text-xs text-muted-foreground mb-2">
                Mensagens por dia · Total: {data?.total ?? 0}
              </div>
              <div className="flex items-end gap-0.5 h-32">
                {data?.byDay.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 bg-primary/70 rounded-sm transition-all hover:bg-primary"
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? "2px" : "0" }}
                    title={`${d.date}: ${d.count}`}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}