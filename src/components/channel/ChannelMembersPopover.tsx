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

  if (isLoading || !members || members.length === 0) {
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
  const displayMembers = sortedMembers.slice(0, 5);
  const extraCount = members.length - displayMembers.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer">
          {/* Avatar Stack */}
          <div className="flex items-center -space-x-2">
            {displayMembers.map((member) => {
              const displayName = member.profile?.display_name || "U";
              const isOnline = isUserOnline(member.profile?.last_seen || null);
              return (
                <div key={member.id} className="relative">
                  <Avatar className={cn(
                    "h-7 w-7 border-2 border-background",
                    isOnline && "ring-1 ring-green-500"
                  )}>
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              );
            })}
            {extraCount > 0 && (
              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <span className="text-[10px] font-medium text-muted-foreground">+{extraCount}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-1">
            {onlineCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                {onlineCount}
              </span>
            )}
          </span>
        </button>
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
