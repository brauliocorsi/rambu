import { motion } from "framer-motion";
import { Hash, Lock, ChevronRight, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Channel } from "@/hooks/useChannels";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { useFavoriteChannelIds, useToggleChannelFavorite } from "@/hooks/useChannelFavorites";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  unreadCounts?: Record<string, number>;
}

export function ChannelList({ channels, selectedChannel, onSelectChannel, unreadCounts = {} }: ChannelListProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const favoriteIds = useFavoriteChannelIds(currentWorkspace?.id || null);
  const toggleFavorite = useToggleChannelFavorite();

  // Sort channels: unread first, then alphabetical
  const sortByUnread = (a: Channel, b: Channel) => {
    const unreadA = unreadCounts[a.id] || 0;
    const unreadB = unreadCounts[b.id] || 0;
    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadB > 0 && unreadA === 0) return 1;
    return a.name.localeCompare(b.name);
  };

  const favoriteChannels = channels.filter(c => favoriteIds.includes(c.id)).sort(sortByUnread);
  const publicChannels = channels.filter(c => !c.is_private && !favoriteIds.includes(c.id)).sort(sortByUnread);
  const privateChannels = channels.filter(c => c.is_private && !favoriteIds.includes(c.id)).sort(sortByUnread);

  const handleToggleFavorite = (e: React.MouseEvent, channelId: string, isFavorite: boolean) => {
    e.stopPropagation();
    toggleFavorite.mutate({ channelId, isFavorite });
  };

  const renderChannel = (channel: Channel, i: number, isFavorite: boolean = false) => {
    const unreadCount = unreadCounts[channel.id] || 0;
    const isPrivate = channel.is_private;

    return (
      <motion.div
        key={channel.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        className="group relative"
      >
        <button
          onClick={() => onSelectChannel(channel)}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-colors",
            selectedChannel?.id === channel.id
              ? "bg-primary/10 text-primary"
              : "hover:bg-secondary",
            unreadCount > 0 && "font-semibold"
          )}
        >
          {isPrivate ? (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={cn("font-medium flex-1 text-left truncate text-sm min-w-0", unreadCount > 0 && "text-primary font-bold")}>{channel.name}</span>
          
          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 && <UnreadBadge count={unreadCount} size="sm" />}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-md transition-opacity",
                isFavorite ? "opacity-100 text-yellow-500" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => handleToggleFavorite(e, channel.id, isFavorite)}
            >
              <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-yellow-500")} />
            </Button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Favorite Channels */}
      {favoriteChannels.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            Favoritos
          </p>
          {favoriteChannels.map((channel, i) => renderChannel(channel, i, true))}
        </div>
      )}

      {/* Public Channels */}
      {publicChannels.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Canais
          </p>
          {publicChannels.map((channel, i) => renderChannel(channel, i))}
        </div>
      )}

      {/* Private Channels */}
      {privateChannels.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Canais Privados
          </p>
          {privateChannels.map((channel, i) => renderChannel(channel, i))}
        </div>
      )}
    </div>
  );
}
