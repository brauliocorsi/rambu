import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch, SearchResult, SearchFilters } from "@/hooks/useSearch";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useChannels } from "@/hooks/useChannels";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Search,
  Hash,
  MessageSquare,
  User,
  Loader2,
  SlidersHorizontal,
  X,
  CalendarIcon,
} from "lucide-react";
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectChannel?: (channelId: string) => void;
  onSelectDM?: (dmId: string) => void;
}

type SearchType = "message" | "dm_message" | "channel" | "user";

const typeOptions: { value: SearchType; label: string; icon: React.ReactNode }[] = [
  { value: "message", label: "Mensagens", icon: <Hash className="h-3 w-3" /> },
  { value: "dm_message", label: "DMs", icon: <MessageSquare className="h-3 w-3" /> },
  { value: "channel", label: "Canais", icon: <Hash className="h-3 w-3" /> },
  { value: "user", label: "Usuários", icon: <User className="h-3 w-3" /> },
];

const periodOptions = [
  { value: "all", label: "Qualquer período" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mês" },
  { value: "custom", label: "Personalizado" },
];

export function SearchDialog({ 
  open, 
  onClose, 
  onSelectChannel,
  onSelectDM,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<SearchType[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  const { currentWorkspace } = useWorkspaceContext();
  const { data: channels = [] } = useChannels(currentWorkspace?.id || null);
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
  const { setCurrentChannel } = useChannelContext();

  // Build filters object - only include non-"all" values
  const channelFilter = selectedChannelId !== "all" ? selectedChannelId : undefined;
  const userFilter = selectedUserId !== "all" ? selectedUserId : undefined;
  
  const filters: SearchFilters | undefined = (selectedTypes.length > 0 || channelFilter || userFilter || dateFrom || dateTo) ? {
    types: selectedTypes.length > 0 ? selectedTypes : [],
    channelId: channelFilter,
    userId: userFilter,
    dateFrom: dateFrom,
    dateTo: dateTo,
  } : undefined;

  const { data: results = [], isLoading } = useSearch(query, open, filters);

  // Handle period changes
  useEffect(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case "today":
        setDateFrom(startOfDay(now));
        setDateTo(endOfDay(now));
        break;
      case "week":
        setDateFrom(startOfDay(subDays(now, 7)));
        setDateTo(endOfDay(now));
        break;
      case "month":
        setDateFrom(startOfDay(subDays(now, 30)));
        setDateTo(endOfDay(now));
        break;
      case "all":
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
      // "custom" keeps current values
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setShowFilters(false);
      setSelectedTypes([]);
      setSelectedChannelId("all");
      setSelectedUserId("all");
      setSelectedPeriod("all");
      setDateFrom(undefined);
      setDateTo(undefined);
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

  const toggleType = (type: SearchType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedChannelId("all");
    setSelectedUserId("all");
    setSelectedPeriod("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const activeFiltersCount = [
    selectedTypes.length > 0,
    selectedChannelId !== "all",
    selectedUserId !== "all",
    selectedPeriod !== "all",
  ].filter(Boolean).length;

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
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Buscar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input with Filter Toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar mensagens, canais, usuários..."
                className="pl-9 rounded-xl"
                autoFocus
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                  {/* Type Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo</label>
                    <div className="flex flex-wrap gap-2">
                      {typeOptions.map((option) => (
                        <Badge
                          key={option.value}
                          variant={selectedTypes.includes(option.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleType(option.value)}
                        >
                          {option.icon}
                          <span className="ml-1">{option.label}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Channel and User Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Canal</label>
                      <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Todos os canais" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os canais</SelectItem>
                          {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              <span className="flex items-center gap-2">
                                <Hash className="h-3 w-3" />
                                {channel.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Usuário</label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Todos os usuários" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          {members.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              <span className="flex items-center gap-2">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {(member.profile?.display_name || "?").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {member.profile?.display_name || "Usuário"}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Period Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Período</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[180px] rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {periodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedPeriod === "custom" && (
                        <div className="flex gap-2 items-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="rounded-xl">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground">até</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="rounded-xl">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filters Preview */}
          {!showFilters && activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map((type) => (
                <Badge key={type} variant="secondary" className="gap-1">
                  {typeOptions.find(t => t.value === type)?.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleType(type)} />
                </Badge>
              ))}
              {selectedChannelId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Hash className="h-3 w-3" />
                  {channels.find(c => c.id === selectedChannelId)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedChannelId("all")} />
                </Badge>
              )}
              {selectedUserId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <User className="h-3 w-3" />
                  {members.find(m => m.user_id === selectedUserId)?.profile?.display_name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedUserId("all")} />
                </Badge>
              )}
              {selectedPeriod !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {periodOptions.find(p => p.value === selectedPeriod)?.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedPeriod("all")} />
                </Badge>
              )}
            </div>
          )}

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
