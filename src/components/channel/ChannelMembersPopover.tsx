import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineIndicator } from "@/components/user/OnlineIndicator";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { isUserOnline } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";

interface ChannelMembersPopoverProps {
  channelId: string;
}

export function ChannelMembersPopover({ channelId }: ChannelMembersPopoverProps) {
  const { data: members, isLoading } = useChannelMembers(channelId);

  if (isLoading || !members) {
    return null;
  }

  // Sort members: online first, then by name
  const sortedMembers = [...members].sort((a, b) => {
    const aOnline = isUserOnline(a.profile?.last_seen || null);
    const bOnline = isUserOnline(b.profile?.last_seen || null);
    
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    
    const aName = a.profile?.display_name || "";
    const bName = b.profile?.display_name || "";
    return aName.localeCompare(bName);
  });

  const onlineCount = members.filter((m) => isUserOnline(m.profile?.last_seen || null)).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm">
            {onlineCount > 0 ? `${onlineCount} online` : `${members.length} membros`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Membros do canal</h4>
          <p className="text-xs text-muted-foreground">
            {members.length} membros • {onlineCount} online
          </p>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {sortedMembers.map((member) => {
              const lastSeen = member.profile?.last_seen || null;
              const isOnline = isUserOnline(lastSeen);
              const status = member.profile?.status || "offline";
              const displayName = member.profile?.display_name || "Usuário";

              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg",
                    isOnline ? "bg-secondary/50" : ""
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineIndicator
                        status={status}
                        lastSeen={lastSeen}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {isOnline 
                        ? (status === "online" ? "Online" : status === "away" ? "Ausente" : status === "dnd" ? "Não perturbe" : "Online")
                        : "Offline"
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
