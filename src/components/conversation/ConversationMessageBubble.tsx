import { MessageBubble } from "@/components/message/MessageBubble";
import { DMMessageBubble } from "@/components/dm/DMMessageBubble";
import { GroupMessageBubble } from "@/components/dm/GroupMessageBubble";
import { useAuth } from "@/hooks/useAuth";
import type { ConversationMessage } from "@/types/conversation";
import type { MessageDensity } from "@/hooks/useLayoutPreferences";

/**
 * Forma de viewData compartilhada entre MessageBubble e DMMessageBubble.
 * Mantida aqui para que `ConversationMessageList` possa tipar um mapa
 * `viewDataById` sem importar de bubbles concretos.
 */
export interface ConversationViewData {
  count: number;
  viewers: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
}

/**
 * Bubble unificado. Delega para MessageBubble (channel) ou
 * DMMessageBubble (dm/group), passando o payload bruto para
 * preservar todas as funcionalidades: reply, edicao, reacoes,
 * read receipts, mentions, threads e acoes.
 */
interface ConversationMessageBubbleProps {
  message: ConversationMessage;
  onReply?: (messageId: string) => void;
  onOpenThread?: (message: any) => void;
  slackMode?: boolean;
  density?: MessageDensity;
  viewData?: ConversationViewData;
}

export function ConversationMessageBubble({
  message,
  onReply,
  onOpenThread,
  slackMode,
  density,
  viewData,
}: ConversationMessageBubbleProps) {
  const { conversationRef, _raw } = message;
  const { user } = useAuth();

  if (conversationRef.type === "channel") {
    return (
      <MessageBubble
        message={_raw}
        channelId={conversationRef.id}
        onReply={onReply}
        onOpenThread={onOpenThread}
        slackMode={slackMode}
        density={density}
        viewData={viewData}
      />
    );
  }

  if (conversationRef.type === "group") {
    return (
      <GroupMessageBubble
        message={_raw}
        currentUserId={user?.id}
        slackMode={slackMode}
        density={density}
      />
    );
  }

  return (
    <DMMessageBubble
      message={_raw}
      dmId={conversationRef.id}
      onReply={onReply}
      slackMode={slackMode}
      density={density}
      viewData={viewData}
    />
  );
}