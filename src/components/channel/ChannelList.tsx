import { motion } from "framer-motion";
import { Hash, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Channel } from "@/hooks/useChannels";

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({ channels, selectedChannel, onSelectChannel }: ChannelListProps) {
  const publicChannels = channels.filter(c => !c.is_private);
  const privateChannels = channels.filter(c => c.is_private);

  return (
    <div className="space-y-4">
      {/* Public Channels */}
      {publicChannels.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Canais
          </p>
          {publicChannels.map((channel, i) => (
            <motion.button
              key={channel.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectChannel(channel)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                selectedChannel?.id === channel.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary"
              )}
            >
              <Hash className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium flex-1 text-left">{channel.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Private Channels */}
      {privateChannels.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Canais Privados
          </p>
          {privateChannels.map((channel, i) => (
            <motion.button
              key={channel.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectChannel(channel)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                selectedChannel?.id === channel.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary"
              )}
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium flex-1 text-left">{channel.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
