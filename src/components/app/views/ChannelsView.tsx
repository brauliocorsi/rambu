import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useChannelContext } from "@/contexts/ChannelContext";
import { useChannels, useDeleteChannel } from "@/hooks/useChannels";
import { useInfiniteMessages } from "@/hooks/useInfiniteMessages";
import { useUnreadChannelCounts, useMarkChannelAsRead } from "@/hooks/useNotifications";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentChannelRole } from "@/hooks/useChannelMembers";
import { CategoryManager } from "@/components/channel/CategoryManager";
import { CreateChannelDialog } from "@/components/channel/CreateChannelDialog";
import { MessageList } from "@/components/message/MessageList";
import { MessageInput } from "@/components/message/MessageInput";
import { ChannelMembersPopover } from "@/components/channel/ChannelMembersPopover";
import { PinnedMessagesPanel } from "@/components/message/PinnedMessagesPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { CreateTaskTemplateDialog } from "@/components/tasks/CreateTaskTemplateDialog";
import { TaskTemplateList } from "@/components/tasks/TaskTemplateList";
import { useSnoozeChannel, SNOOZE_OPTIONS } from "@/hooks/useSnoozeChannel";
import { useChannelNotificationPreference } from "@/hooks/useChannelNotificationPreferences";

// Channel Chat View
function ChannelChatView() {
  const { currentChannel, setCurrentChannel } = useChannelContext();
  const { currentWorkspace } = useWorkspaceContext();
  const { messages, isLoading, isFetchingMore, hasMore, loadMore } = useInfiniteMessages(currentChannel?.id || null);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [showPinned, setShowPinned] = useState(false);
  const { data: profile } = useProfile();
  const { data: channelRole } = useCurrentChannelRole(currentChannel?.id || null);
  const deleteChannel = useDeleteChannel();
  const { typingUsers, sendTypingStart, sendTypingStop } = useTypingIndicator(currentChannel?.id || null, false);
  const snooze = useSnoozeChannel();
  const { data: notifPref } = useChannelNotificationPreference(currentChannel?.id || null);
  const isSnoozed = !!(notifPref?.snoozed_until && new Date(notifPref.snoozed_until as any) > new Date());

  if (!currentChannel) return null;

  const handleTyping = () => {
    if (profile?.display_name) {
      sendTypingStart(profile.display_name);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Channel Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => setCurrentChannel(null)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold flex items-center gap-1">
            <Hash className="h-4 w-4" />
            {currentChannel.name}
          </h2>
          {currentChannel.description && (
            <p className="text-xs text-muted-foreground truncate">{currentChannel.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ChannelMembersPopover channelId={currentChannel.id} />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9 touch-target"
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
            className="rounded-xl h-9 w-9 touch-target"
            onClick={() => setShowPinned(true)}
            title="Mensagens fixadas"
          >
            <Pin className="h-4.5 w-4.5" />
          </Button>
          {(channelRole === 'owner' || channelRole === 'admin') && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 touch-target">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-48 z-[60]" sideOffset={4}>
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <MessageList
        messages={messages}
        channelId={currentChannel.id}
        channelName={currentChannel.name}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReply={setReplyTo}
        typingUsers={typingUsers}
      />

      {/* Message Input */}
      <MessageInput
        channelId={currentChannel.id}
        channelName={currentChannel.name}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        onTyping={handleTyping}
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
  const markAsRead = useMarkChannelAsRead();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  // Mark channel as read when selected
  useEffect(() => {
    if (currentChannel) {
      markAsRead.mutate(currentChannel.id);
    }
  }, [currentChannel?.id]);

  if (currentChannel) {
    return <div className="h-full min-h-0"><ChannelChatView /></div>;
  }

  if (!currentWorkspace) {
    return (
      <div className="p-4">
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhum workspace</h3>
            <p className="text-sm text-muted-foreground">Crie um workspace para criar canais!</p>
          </div>
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
        <Card className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-full gradient-primary-soft flex items-center justify-center">
            <Hash className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Nenhum canal</h3>
            <p className="text-sm text-muted-foreground">Crie o primeiro canal em {currentWorkspace.name}!</p>
          </div>
          <Button 
            className="rounded-xl gradient-primary text-white"
            onClick={() => setShowCreateChannel(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Canal
          </Button>
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
