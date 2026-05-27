import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useChannels, useDeleteChannel } from "@/hooks/useChannels";
import { useInfiniteMessages } from "@/hooks/useInfiniteMessages";
import { useUnreadChannelCounts } from "@/hooks/useNotifications";
import { useConversationReadStatus } from "@/hooks/useConversationReadStatus";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useRecordMessageView, useMessageViewCounts } from "@/hooks/useMessageViews";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentChannelRole } from "@/hooks/useChannelMembers";
import { CategoryManager } from "@/components/channel/CategoryManager";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { ConversationMessageList } from "@/components/conversation/ConversationMessageList";
import { normalizeMessage } from "@/lib/conversation/normalizeMessage";
import { useLayoutPreferences } from "@/hooks/useLayoutPreferences";
import { ConversationComposer } from "@/components/conversation/ConversationComposer";
import { ChannelMembersPopover } from "@/components/channel/ChannelMembersPopover";
import { JumpToDateButton } from "@/components/channel/JumpToDateButton";
import { PinnedMessagesPanel } from "@/components/message/PinnedMessagesPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Hash, 
  Plus, 
  Briefcase,
  ArrowLeft,
  MoreVertical,
  Trash2,
  ClipboardList,
  Pin,
  BellOff,
  Bell,
  Download,
  FileJson,
  FileText,
} from "lucide-react";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { TaskTemplateList } from "@/components/tasks/TaskTemplateList";
import { useSnoozeChannel, SNOOZE_OPTIONS } from "@/hooks/useSnoozeChannel";
import { useChannelNotificationPreference } from "@/hooks/useChannelNotificationPreferences";
import { LabelPicker } from "@/components/labels/LabelPicker";
import { exportAsJSON, exportAsText } from "@/lib/exportConversation";

// Channel Chat View
function ChannelChatView() {
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { currentWorkspace } = useWorkspaceContext();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore, jumpToDate, isJumping } = useInfiniteMessages(currentChannel?.id || null);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [showPinned, setShowPinned] = useState(false);
  const { data: profile } = useProfile();
  const { data: channelRole } = useCurrentChannelRole(currentChannel?.id || null);
  const deleteChannel = useDeleteChannel();
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(currentChannel?.id || null, false);
  const snooze = useSnoozeChannel();
  const { data: notifPref } = useChannelNotificationPreference(currentChannel?.id || null);
  const snoozedUntil = (notifPref as any)?.snoozed_until as string | null | undefined;
  const isSnoozed = !!(snoozedUntil && new Date(snoozedUntil) > new Date());

  // Read-view tracking centralizado no call-site (Fase 5-Channel-prep).
  // Quando `viewDataById` é fornecido, `MessageList` não chama
  // `useRecordMessageView`/`useMessageViewCounts` internamente, evitando
  // duplicação de fetch/realtime.
  const visibleMessageIds = useMemo(
    () => messages.map((m) => m.id).filter((id) => !id.startsWith("temp-")),
    [messages]
  );
  useRecordMessageView(visibleMessageIds, currentChannel?.id || null);
  const { data: viewDataById = {} } = useMessageViewCounts(visibleMessageIds);

  // Layout preferences + normalização para a camada unificada.
  const { preferences: layoutPreferences } = useLayoutPreferences();
  const conversationRef = useMemo(
    () =>
      currentChannel
        ? {
            type: "channel" as const,
            id: currentChannel.id,
            workspaceId: currentWorkspace?.id,
            displayName: currentChannel.name,
          }
        : null,
    [currentChannel?.id, currentWorkspace?.id, currentChannel?.name]
  );
  const conversationMessages = useMemo(() => {
    if (!conversationRef) return [];
    return messages.map((m) => normalizeMessage(conversationRef, m));
  }, [messages, conversationRef]);

  if (!currentChannel) return null;

  const handleTyping = () => {
    if (profile?.display_name) {
      sendTypingStart(profile.display_name);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Channel Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-9 w-9 shrink-0"
          onClick={() => setCurrentChannel(null)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold flex items-center gap-1 min-w-0">
            <Hash className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentChannel.name}</span>
          </h2>
          {currentChannel.description && (
            <p className="text-xs text-muted-foreground truncate">{currentChannel.description}</p>
          )}
          <div className="mt-1 hidden sm:block">
            <LabelPicker channelId={currentChannel.id} />
          </div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <div className="hidden md:flex items-center gap-1">
            <ChannelMembersPopover channelId={currentChannel.id} />
            <JumpToDateButton jumpToDate={jumpToDate} isJumping={isJumping} />
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex rounded-xl h-9 w-9 touch-target"
                title={isSnoozed ? "Silenciado" : "Silenciar canal"}
              >
                {isSnoozed ? <BellOff className="h-4.5 w-4.5 text-muted-foreground" /> : <Bell className="h-4.5 w-4.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-52 z-[60]">
              {SNOOZE_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  className="rounded-lg cursor-pointer"
                  onSelect={() => snooze.mutate({ channelId: currentChannel.id, duration: opt.value })}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex rounded-xl h-9 w-9 touch-target"
            onClick={() => setShowPinned(true)}
            title="Mensagens fixadas"
          >
            <Pin className="h-4.5 w-4.5" />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:inline-flex rounded-xl h-9 w-9 touch-target" title="Exportar">
                <Download className="h-4.5 w-4.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-48 z-[60]">
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onSelect={() => exportAsText({ type: "channel", id: currentChannel.id, name: currentChannel.name })}
              >
                <FileText className="h-4 w-4 mr-2" /> Exportar texto
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onSelect={() => exportAsJSON({ type: "channel", id: currentChannel.id, name: currentChannel.name })}
              >
                <FileJson className="h-4 w-4 mr-2" /> Exportar JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 touch-target" title="Mais opções">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-56 z-[60]" sideOffset={4}>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer sm:hidden"
                onSelect={() => setShowPinned(true)}
              >
                <Pin className="h-4 w-4 mr-2" /> Mensagens fixadas
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer sm:hidden"
                onSelect={() => exportAsText({ type: "channel", id: currentChannel.id, name: currentChannel.name })}
              >
                <FileText className="h-4 w-4 mr-2" /> Exportar texto
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer sm:hidden"
                onSelect={() => exportAsJSON({ type: "channel", id: currentChannel.id, name: currentChannel.name })}
              >
                <FileJson className="h-4 w-4 mr-2" /> Exportar JSON
              </DropdownMenuItem>
              {(channelRole === 'owner' || channelRole === 'admin') && (
                <DropdownMenuItem
                  className="rounded-lg text-destructive focus:text-destructive cursor-pointer"
                  onSelect={() => {
                    if (confirm(`Remover o canal #${currentChannel.name}? Esta ação não pode ser desfeita.`)) {
                      deleteChannel.mutate(
                        { channelId: currentChannel.id, workspaceId: currentWorkspace!.id },
                        { onSuccess: () => setCurrentChannel(null) }
                      );
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Canal
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      {conversationRef && (
        <ConversationMessageList
          conversation={conversationRef}
          conversationName={currentChannel.name}
          messages={conversationMessages}
          isLoading={isLoading}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onReply={setReplyTo}
          typingUsers={typingUsers}
          viewDataById={viewDataById}
          slackMode={layoutPreferences.slackMode}
          density={layoutPreferences.density}
        />
      )}

      {/* Message Input (camada unificada) */}
      <ConversationComposer
        conversation={{
          type: "channel",
          id: currentChannel.id,
          displayName: currentChannel.name,
        }}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        onTyping={() => handleTyping()}
        onStopTyping={sendTypingStop}
      />
      <PinnedMessagesPanel
        open={showPinned}
        onOpenChange={setShowPinned}
        scope={{ type: "channel", id: currentChannel.id }}
        onJump={(id) => {
          const el = document.querySelector(`[data-message-id="${id}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("bg-primary/10");
            setTimeout(() => el.classList.remove("bg-primary/10"), 2000);
          }
        }}
      />
    </div>
  );
}

export function ChannelsView() {
  const { currentWorkspace } = useWorkspaceContext();
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { data: channels = [], isLoading } = useChannels(currentWorkspace?.id || null);
  const { data: unreadCounts = {} } = useUnreadChannelCounts(currentWorkspace?.id || null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  // Auto-mark via hook centralizado: debounce + visibilidade + cancel-on-switch.
  useConversationReadStatus(
    currentChannel ? { type: "channel", id: currentChannel.id } : null,
    {
      autoMark: true,
      hasUnread: currentChannel ? (unreadCounts[currentChannel.id] ?? 0) > 0 : false,
    },
  );

  if (currentChannel) {
    return <div className="h-full min-h-0"><ChannelChatView /></div>;
  }

  if (!currentWorkspace) {
    return (
      <div className="p-4">
        <Card className="rounded-2xl border-border/60">
          <EmptyState
            icon={Briefcase}
            tone="channel"
            title="Nenhum workspace"
            description="Crie um workspace para começar a organizar seus canais."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Canais</h2>
        <div className="flex items-center gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-xl"
            onClick={() => setShowCreateTemplate(true)}
            title="Gerenciar fluxos de tarefa"
          >
            <ClipboardList className="h-5 w-5" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-xl"
            onClick={() => setShowCreateChannel(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 rounded-2xl flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </Card>
      ) : channels.length === 0 ? (
        <Card className="rounded-2xl border-border/60">
          <EmptyState
            icon={Hash}
            tone="channel"
            title="Nenhum canal ainda"
            description={`Crie o primeiro canal em ${currentWorkspace.name} e comece a conversar.`}
            action={
              <Button
                className="rounded-xl gradient-primary text-white shadow-md-token"
                onClick={() => setShowCreateChannel(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Canal
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="p-2 rounded-2xl">
          <CategoryManager
            workspaceId={currentWorkspace.id}
            channels={channels}
            selectedChannel={currentChannel}
            onSelectChannel={setCurrentChannel}
            unreadCounts={unreadCounts}
          />
        </Card>
      )}

      <CreateChannelDialog open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
      
      {currentWorkspace && (
        <CreateTaskTemplateDialog
          open={showCreateTemplate}
          onClose={() => setShowCreateTemplate(false)}
          workspaceId={currentWorkspace.id}
        />
      )}
    </div>
  );
}
