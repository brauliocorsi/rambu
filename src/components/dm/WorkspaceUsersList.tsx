import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarWithStatus } from "@/components/user/OnlineIndicator";
import { isUserOnline } from "@/hooks/usePresence";
import { Card } from "@/components/ui/card";
import { Users, Circle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WorkspaceUser {
  id: string;
  user_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    status: string | null;
    last_seen: string | null;
  };
}

interface WorkspaceUsersListProps {
  members: WorkspaceUser[];
  currentUserId?: string;
  onSelectUser?: (userId: string) => void;
}

export function WorkspaceUsersList({ members, currentUserId, onSelectUser }: WorkspaceUsersListProps) {
  // Separate online and offline, excluding current user
  const otherMembers = members.filter(m => m.user_id !== currentUserId);
  
  const onlineMembers = otherMembers.filter(m => {
    const status = m.profile?.status;
    const lastSeen = m.profile?.last_seen || null;
    return status === 'online' && isUserOnline(lastSeen);
  });

  const offlineMembers = otherMembers.filter(m => {
    const status = m.profile?.status;
    const lastSeen = m.profile?.last_seen || null;
    return !(status === 'online' && isUserOnline(lastSeen));
  });

  if (otherMembers.length === 0) return null;

  return (
    <Card className="p-2 rounded-2xl">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 flex items-center gap-1">
        <Users className="h-3 w-3" />
        Usuários ({otherMembers.length})
      </p>

      <ScrollArea className="max-h-60">
        {/* Online users */}
        {onlineMembers.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 flex items-center gap-1">
              <Circle className="h-2 w-2 fill-success text-success" />
              Online — {onlineMembers.length}
            </p>
            {onlineMembers.map((member, i) => (
              <UserItem key={member.id} member={member} index={i} onSelect={onSelectUser} />
            ))}
          </div>
        )}

        {/* Offline users */}
        {offlineMembers.length > 0 && (
          <div className="space-y-0.5 mt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 flex items-center gap-1">
              <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground" />
              Offline — {offlineMembers.length}
            </p>
            {offlineMembers.map((member, i) => (
              <UserItem key={member.id} member={member} index={i} onSelect={onSelectUser} />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}

function UserItem({ member, index, onSelect }: { member: WorkspaceUser; index: number; onSelect?: (userId: string) => void }) {
  const displayName = member.profile?.display_name || "Usuário";
  const status = member.profile?.status || null;
  const lastSeen = member.profile?.last_seen || null;

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect?.(member.user_id)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-secondary"
    >
      <AvatarWithStatus status={status} lastSeen={lastSeen} indicatorSize="sm">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs gradient-primary text-white">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </AvatarWithStatus>
      <span className={cn(
        "text-sm truncate",
        status === 'online' && isUserOnline(lastSeen) ? "font-medium" : "text-muted-foreground"
      )}>
        {displayName}
      </span>
    </motion.button>
  );
}
