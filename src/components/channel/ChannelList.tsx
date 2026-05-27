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
            "group/item w-full flex items-center gap-2 px-2.5 h-9 rounded-md transition-colors duration-150 relative",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            selectedChannel?.id === channel.id
              ? "bg-[hsl(var(--sidebar-accent))] text-sidebar-accent-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary"
              : "hover:bg-[hsl(var(--sidebar-accent))]/60 text-[hsl(var(--sidebar-foreground))]",
            unreadCount > 0 && "text-sidebar-accent-foreground"
          )}
          aria-current={selectedChannel?.id === channel.id ? "page" : undefined}
        >
          {isPrivate ? (
            <Lock className={cn("h-[15px] w-[15px] shrink-0", selectedChannel?.id === channel.id ? "text-primary" : "text-[hsl(var(--sidebar-foreground))]/60")} />
          ) : (
            <Hash className={cn("h-[15px] w-[15px] shrink-0", selectedChannel?.id === channel.id ? "text-primary" : "text-[hsl(var(--sidebar-foreground))]/60")} />
          )}
          <span className={cn(
            "flex-1 text-left truncate text-[13.5px] min-w-0 tracking-tight",
            unreadCount > 0 ? "font-semibold" : "font-normal"
          )}>{channel.name}</span>
          
          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 && <UnreadBadge count={unreadCount} size="sm" />}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-md transition-opacity hover:bg-[hsl(var(--sidebar-accent))]",
                isFavorite ? "opacity-100 text-[hsl(var(--rambu-warning))]" : "opacity-0 group-hover:opacity-100 text-[hsl(var(--sidebar-foreground))]/70"
              )}
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={(e) => handleToggleFavorite(e, channel.id, isFavorite)}
            >
              <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-[hsl(var(--rambu-warning))]")} />
            </Button>
            <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground))]/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Favorite Channels */}
      {favoriteChannels.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10.5px] font-semibold text-[hsl(var(--sidebar-foreground))]/55 uppercase tracking-[0.1em] px-2.5 mb-1 flex items-center gap-1.5">
            <Star className="h-3 w-3 text-[hsl(var(--rambu-warning))] fill-[hsl(var(--rambu-warning))]" />
            Favoritos
          </p>
          {favoriteChannels.map((channel, i) => renderChannel(channel, i, true))}
        </div>
      )}

      {/* Public Channels */}
      {publicChannels.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10.5px] font-semibold text-[hsl(var(--sidebar-foreground))]/55 uppercase tracking-[0.1em] px-2.5 mb-1">
            Canais
          </p>
          {publicChannels.map((channel, i) => renderChannel(channel, i))}
        </div>
      )}

      {/* Private Channels */}
      {privateChannels.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10.5px] font-semibold text-[hsl(var(--sidebar-foreground))]/55 uppercase tracking-[0.1em] px-2.5 mb-1">
            Canais Privados
          </p>
          {privateChannels.map((channel, i) => renderChannel(channel, i))}
        </div>
      )}
    </div>
  );
}
