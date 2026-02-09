import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch, SearchResult, SearchFilters } from "@/hooks/useSearch";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useChannels } from "@/hooks/useChannels";
import { useDirectMessages } from "@/hooks/useDirectMessages";
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
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import {
  Search,
  Hash,
  MessageSquare,
  User,
  Loader2,
  SlidersHorizontal,
  X,
  CalendarIcon,
  FileText,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

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
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mês" },
  { value: "custom", label: "Período personalizado" },
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
  const [selectedDMId, setSelectedDMId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [singleDate, setSingleDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"single" | "range">("range");
  
  const { currentWorkspace } = useWorkspaceContext();
  const { data: channels = [] } = useChannels(currentWorkspace?.id || null);
  const { data: dms = [] } = useDirectMessages(currentWorkspace?.id || null);
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id || null);
  const { setCurrentChannel } = useChannelContext();

  // Calculate date filters
  const dateFrom = useMemo(() => {
    if (datePickerMode === "single" && singleDate) {
      return startOfDay(singleDate);
    }
    return dateRange?.from ? startOfDay(dateRange.from) : undefined;
  }, [dateRange, singleDate, datePickerMode]);

  const dateTo = useMemo(() => {
    if (datePickerMode === "single" && singleDate) {
      return endOfDay(singleDate);
    }
    return dateRange?.to ? endOfDay(dateRange.to) : undefined;
  }, [dateRange, singleDate, datePickerMode]);

  // Build filters object - only include non-"all" values
  const channelFilter = selectedChannelId !== "all" ? selectedChannelId : undefined;
  const dmFilter = selectedDMId !== "all" ? selectedDMId : undefined;
  const userFilter = selectedUserId !== "all" ? selectedUserId : undefined;
  
  const hasActiveFilters = selectedTypes.length > 0 || channelFilter || dmFilter || userFilter || dateFrom || dateTo;
  
  const filters: SearchFilters | undefined = hasActiveFilters ? {
    types: selectedTypes.length > 0 ? selectedTypes : [],
    channelId: channelFilter,
    dmId: dmFilter,
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
        setDatePickerMode("single");
        setSingleDate(now);
        setDateRange(undefined);
        break;
      case "yesterday":
        setDatePickerMode("single");
        setSingleDate(subDays(now, 1));
        setDateRange(undefined);
        break;
      case "week":
        setDatePickerMode("range");
        setSingleDate(undefined);
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "month":
        setDatePickerMode("range");
        setSingleDate(undefined);
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "all":
        setSingleDate(undefined);
        setDateRange(undefined);
        break;
      case "custom":
        // Keep current values, user will select manually
        break;
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setShowFilters(false);
      setSelectedTypes([]);
      setSelectedChannelId("all");
      setSelectedDMId("all");
      setSelectedUserId("all");
      setSelectedPeriod("all");
      setSingleDate(undefined);
      setDateRange(undefined);
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
    setSelectedDMId("all");
    setSelectedUserId("all");
    setSelectedPeriod("all");
    setSingleDate(undefined);
    setDateRange(undefined);
  };

  const activeFiltersCount = [
    selectedTypes.length > 0,
    selectedChannelId !== "all",
    selectedDMId !== "all",
    selectedUserId !== "all",
    selectedPeriod !== "all",
  ].filter(Boolean).length;

  // Results statistics
  const resultsStats = useMemo(() => {
    const stats = {
      total: results.length,
      messages: results.filter(r => r.type === "message").length,
      dmMessages: results.filter(r => r.type === "dm_message").length,
      channels: results.filter(r => r.type === "channel").length,
      users: results.filter(r => r.type === "user").length,
    };
    return stats;
  }, [results]);

  // Highlight search term in content
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
      ) : part
    );
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

                  {/* Channel, DM and User Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <label className="text-sm font-medium mb-2 block">DM</label>
                      <Select value={selectedDMId} onValueChange={setSelectedDMId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Todas as conversas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as conversas</SelectItem>
                          {dms.map((dm) => (
                            <SelectItem key={dm.id} value={dm.id}>
                              <span className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                {dm.other_user?.display_name || "Conversa"}
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
                        <div className="flex gap-2 items-center flex-wrap">
                          <div className="flex gap-1">
                            <Button
                              variant={datePickerMode === "single" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setDatePickerMode("single");
                                setDateRange(undefined);
                              }}
                              className="rounded-l-xl rounded-r-none text-xs"
                            >
                              Dia específico
                            </Button>
                            <Button
                              variant={datePickerMode === "range" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setDatePickerMode("range");
                                setSingleDate(undefined);
                              }}
                              className="rounded-r-xl rounded-l-none text-xs"
                            >
                              Período
                            </Button>
                          </div>

                          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="rounded-xl gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                {datePickerMode === "single" ? (
                                  singleDate ? format(singleDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar dia"
                                ) : (
                                  dateRange?.from ? (
                                    dateRange.to ? (
                                      <>
                                        {format(dateRange.from, "dd/MM", { locale: ptBR })}
                                        <ArrowRight className="h-3 w-3" />
                                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                                      </>
                                    ) : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                                  ) : "Selecionar período"
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              {datePickerMode === "single" ? (
                                <Calendar
                                  mode="single"
                                  selected={singleDate}
                                  onSelect={(date) => {
                                    setSingleDate(date);
                                    setShowDatePicker(false);
                                  }}
                                  locale={ptBR}
                                  className={cn("p-3 pointer-events-auto")}
                                  disabled={(date) => date > new Date()}
                                />
                              ) : (
                                <Calendar
                                  mode="range"
                                  selected={dateRange}
                                  onSelect={(range) => {
                                    setDateRange(range);
                                    if (range?.from && range?.to) {
                                      setShowDatePicker(false);
                                    }
                                  }}
                                  locale={ptBR}
                                  className={cn("p-3 pointer-events-auto")}
                                  numberOfMonths={2}
                                  disabled={(date) => date > new Date()}
                                />
                              )}
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
              {selectedDMId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {dms.find(d => d.id === selectedDMId)?.other_user?.display_name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedDMId("all")} />
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
                  <Clock className="h-3 w-3" />
                  {selectedPeriod === "custom" ? (
                    datePickerMode === "single" && singleDate ? (
                      format(singleDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : dateRange?.from ? (
                      `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${dateRange.to ? format(dateRange.to, "dd/MM", { locale: ptBR }) : "..."}`
                    ) : periodOptions.find(p => p.value === selectedPeriod)?.label
                  ) : periodOptions.find(p => p.value === selectedPeriod)?.label}
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
                  {/* Results Statistics */}
                  <div className="flex items-center gap-4 px-2 py-2 bg-muted/50 rounded-xl text-sm">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{resultsStats.total}</strong> resultados
                    </span>
                    {resultsStats.messages > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {resultsStats.messages}
                      </span>
                    )}
                    {resultsStats.dmMessages > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {resultsStats.dmMessages}
                      </span>
                    )}
                    {resultsStats.channels > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {resultsStats.channels}
                      </span>
                    )}
                    {resultsStats.users > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {resultsStats.users}
                      </span>
                    )}
                  </div>

                  {Object.entries(groupedResults).map(([type, items]) => (
                    <div key={type}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
                        {getIcon(type as SearchResult["type"])}
                        {getTypeLabel(type as SearchResult["type"])} 
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                      </h4>
                      <div className="space-y-1">
                        {items.map((result, index) => (
                          <motion.button
                            key={result.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => handleSelectResult(result)}
                            className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left group"
                          >
                            {result.userAvatar ? (
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={result.userAvatar} />
                                <AvatarFallback>
                                  {(result.userName || result.name || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                {getIcon(result.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {result.type === "channel" ? (
                                  <span className="font-medium flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {highlightText(result.name || "", query)}
                                  </span>
                                ) : result.type === "user" ? (
                                  <span className="font-medium">{highlightText(result.name || "", query)}</span>
                                ) : (
                                  <>
                                    <span className="font-medium">{result.userName}</span>
                                    {result.channelName && (
                                      <Badge variant="outline" className="text-xs gap-1">
                                        <Hash className="h-2.5 w-2.5" />
                                        {result.channelName}
                                      </Badge>
                                    )}
                                    {result.type === "dm_message" && (
                                      <Badge variant="outline" className="text-xs gap-1 bg-success/10 text-success border-success/30">
                                        <MessageSquare className="h-2.5 w-2.5" />
                                        DM
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                              {result.content && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {highlightText(result.content, query)}
                                </p>
                              )}
                              {result.createdAt && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(result.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    ({formatDistanceToNow(new Date(result.createdAt), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })})
                                  </span>
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                      <Separator className="mt-4" />
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
