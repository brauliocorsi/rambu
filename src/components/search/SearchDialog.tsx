import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch, SearchResult } from "@/hooks/useSearch";
import { useChannelContext } from "@/contexts/ChannelContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Hash,
  MessageSquare,
  User,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectChannel?: (channelId: string) => void;
  onSelectDM?: (dmId: string) => void;
}

export function SearchDialog({ 
  open, 
  onClose, 
  onSelectChannel,
  onSelectDM,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const { data: results = [], isLoading } = useSearch(query, open);
  const { setCurrentChannel } = useChannelContext();

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === "channel" || result.type === "message") {
      if (result.channelId && onSelectChannel) {
        onSelectChannel(result.channelId);
      } else if (result.type === "channel" && onSelectChannel) {
        onSelectChannel(result.id);
      }
    } else if ((result.type === "dm_message" || result.type === "user") && result.dmId && onSelectDM) {
      onSelectDM(result.dmId);
    }
    onClose();
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "channel":
        return <Hash className="h-4 w-4" />;
      case "message":
        return <Hash className="h-4 w-4" />;
      case "dm_message":
        return <MessageSquare className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "channel":
        return "Canal";
      case "message":
        return "Mensagem em canal";
      case "dm_message":
        return "Mensagem direta";
      case "user":
        return "Usuário";
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Buscar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar mensagens, canais, usuários..."
              className="pl-9 rounded-xl"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px]">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-8"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </motion.div>
              ) : query.length < 2 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Digite pelo menos 2 caracteres para buscar</p>
                </motion.div>
              ) : results.length === 0 ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <p>Nenhum resultado encontrado</p>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {Object.entries(groupedResults).map(([type, items]) => (
                    <div key={type}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                        {getTypeLabel(type as SearchResult["type"])} ({items.length})
                      </h4>
                      <div className="space-y-1">
                        {items.map((result, index) => (
                          <motion.button
                            key={result.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => handleSelectResult(result)}
                            className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                          >
                            {result.userAvatar ? (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={result.userAvatar} />
                                <AvatarFallback>
                                  {(result.userName || result.name || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                {getIcon(result.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {result.type === "channel" ? (
                                  <span className="font-medium flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {result.name}
                                  </span>
                                ) : result.type === "user" ? (
                                  <span className="font-medium">{result.name}</span>
                                ) : (
                                  <>
                                    <span className="font-medium">{result.userName}</span>
                                    {result.channelName && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        em <Hash className="h-3 w-3" />{result.channelName}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              {result.content && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {result.content}
                                </p>
                              )}
                              {result.createdAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(result.createdAt), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </p>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
