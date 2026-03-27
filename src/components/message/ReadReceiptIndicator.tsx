import { useState } from "react";
import { Check, CheckCheck, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessageViews, useDMMessageViews } from "@/hooks/useMessageViews";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ViewerInfo {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ReadReceiptIndicatorProps {
  messageId: string;
  isOwn: boolean;
  type: "channel" | "dm";
  viewerCount?: number;
  viewers?: ViewerInfo[];
  className?: string;
}

export function ReadReceiptIndicator({ 
  messageId, 
  isOwn, 
  type, 
  viewerCount = 0, 
  viewers = [],
  className 
}: ReadReceiptIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Only show for own messages
  if (!isOwn) return null;

  const hasViewers = viewerCount > 0;
  // Show up to 3 viewer avatars
  const displayViewers = viewers.slice(0, 3);
  const extraCount = viewerCount - 3;

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 mt-0.5 text-xs transition-colors",
            hasViewers ? "text-primary/70 hover:text-primary" : "text-muted-foreground/50",
            className
          )}
        >
          {hasViewers ? (
            <>
              <CheckCheck className="h-3.5 w-3.5" />
              {displayViewers.length > 0 && (
                <div className="flex -space-x-1.5 ml-0.5">
                  {displayViewers.map((v) => (
                    <Avatar key={v.user_id} className="h-4 w-4 border border-background">
                      <AvatarImage src={v.avatar_url || undefined} />
                      <AvatarFallback className="text-[6px] bg-primary/20 text-primary">
                        {(v.display_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
              {extraCount > 0 && (
                <span className="text-[10px] text-muted-foreground">+{extraCount}</span>
              )}
            </>
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 rounded-xl" 
        align={isOwn ? "end" : "start"}
        side="top"
      >
        <ReadReceiptDetails messageId={messageId} type={type} />
      </PopoverContent>
    </Popover>
  );
}

function ReadReceiptDetails({ messageId, type }: { messageId: string; type: "channel" | "dm" }) {
  const channelViews = useMessageViews(type === "channel" ? messageId : null);
  const dmViews = useDMMessageViews(type === "dm" ? messageId : null);
  
  const views = type === "channel" ? channelViews.data : dmViews.data;
  const isLoading = type === "channel" ? channelViews.isLoading : dmViews.isLoading;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!views || views.length === 0) {
    return (
      <div className="p-4 text-center">
        <Eye className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Ninguém visualizou ainda</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-3 border-b border-border">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Visualizado por {views.length}
        </h4>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {views.map((view) => (
          <div key={view.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarImage src={view.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {(view.profile?.display_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {view.profile?.display_name || "Usuário"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(view.viewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
