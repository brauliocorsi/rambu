import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Parse mentions from message content
export function parseMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const userIds: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    userIds.push(match[2]); // The user ID is in the second capture group
  }
  
  return userIds;
}

// Convert @mentions to display format
export function formatMentionsForDisplay(content: string): string {
  return content.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1');
}

// Check if a specific user is mentioned
export function isUserMentioned(content: string, userId: string): boolean {
  const mentions = parseMentions(content);
  return mentions.includes(userId);
}

export function useCreateMentions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      dmMessageId,
      threadMessageId,
      mentionedUserIds,
    }: {
      messageId?: string;
      dmMessageId?: string;
      threadMessageId?: string;
      mentionedUserIds: string[];
    }) => {
      if (mentionedUserIds.length === 0) return;

      const mentions = mentionedUserIds.map((userId) => ({
        message_id: messageId || null,
        dm_message_id: dmMessageId || null,
        thread_message_id: threadMessageId || null,
        mentioned_user_id: userId,
      }));

      const { error } = await supabase
        .from("message_mentions")
        .insert(mentions);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentions"] });
    },
  });
}
