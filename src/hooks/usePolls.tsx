import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEffect } from "react";

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  position: number;
  vote_count: number;
  voted_by_me: boolean;
  voters: { id: string; display_name: string | null; avatar_url: string | null }[];
}

export interface Poll {
  id: string;
  channel_id: string;
  created_by: string;
  question: string;
  is_multiple_choice: boolean;
  is_anonymous: boolean;
  message_id: string | null;
  created_at: string;
  options: PollOption[];
  total_votes: number;
  creator_name: string | null;
}

export function usePollByMessageId(messageId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["poll-by-message", messageId],
    queryFn: async () => {
      if (!messageId || !user) return null;

      const { data: poll, error } = await supabase
        .from("polls")
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();

      if (error) throw error;
      if (!poll) return null;

      // Fetch options
      const { data: options } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("position");

      if (!options) return null;

      // Fetch all votes for this poll
      const optionIds = options.map((o) => o.id);
      const { data: votes } = await supabase
        .from("poll_votes")
        .select("*")
        .in("poll_option_id", optionIds);

      // Fetch voter profiles if not anonymous
      let voterProfiles = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (!poll.is_anonymous && votes && votes.length > 0) {
        const voterIds = [...new Set(votes.map((v) => v.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", voterIds);
        profiles?.forEach((p) => voterProfiles.set(p.id, p));
      }

      // Fetch creator name
      const { data: creator } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", poll.created_by)
        .single();

      const totalVotes = votes?.length || 0;

      const enrichedOptions: PollOption[] = options.map((o) => {
        const optionVotes = votes?.filter((v) => v.poll_option_id === o.id) || [];
        return {
          id: o.id,
          poll_id: o.poll_id,
          option_text: o.option_text,
          position: o.position,
          vote_count: optionVotes.length,
          voted_by_me: optionVotes.some((v) => v.user_id === user.id),
          voters: poll.is_anonymous
            ? []
            : optionVotes.map((v) => ({
                id: v.user_id,
                ...(voterProfiles.get(v.user_id) || { display_name: null, avatar_url: null }),
              })),
        };
      });

      return {
        ...poll,
        options: enrichedOptions,
        total_votes: totalVotes,
        creator_name: creator?.display_name || null,
      } as Poll;
    },
    enabled: !!messageId && !!user,
    refetchInterval: (query) => {
      return query.state.data === null ? 2000 : false;
    },
  });

  // Realtime subscription for votes
  useEffect(() => {
    if (!query.data?.id) return;
    const optionIds = query.data.options.map((o) => o.id);
    if (optionIds.length === 0) return;

    const channel = supabase
      .channel(`poll-votes-${query.data.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        (payload) => {
          const optId = (payload.new as any)?.poll_option_id || (payload.old as any)?.poll_option_id;
          if (optionIds.includes(optId)) {
            queryClient.invalidateQueries({ queryKey: ["poll-by-message", messageId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.data?.id, messageId, queryClient]);

  return query;
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      channelId,
      question,
      options,
      isMultipleChoice,
      isAnonymous,
      messageId,
    }: {
      channelId: string;
      question: string;
      options: string[];
      isMultipleChoice: boolean;
      isAnonymous: boolean;
      messageId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          channel_id: channelId,
          created_by: user.id,
          question,
          is_multiple_choice: isMultipleChoice,
          is_anonymous: isAnonymous,
          message_id: messageId,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(
          options.map((text, i) => ({
            poll_id: poll.id,
            option_text: text,
            position: i,
          }))
        );

      if (optionsError) throw optionsError;
      return poll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-by-message"] });
    },
    onError: () => {
      toast.error("Erro ao criar enquete");
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pollOptionId,
      pollId,
      messageId,
      isMultipleChoice,
    }: {
      pollOptionId: string;
      pollId: string;
      messageId: string;
      isMultipleChoice: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if already voted on this option
      const { data: existing } = await supabase
        .from("poll_votes")
        .select("id")
        .eq("poll_option_id", pollOptionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Remove vote (toggle)
        await supabase.from("poll_votes").delete().eq("id", existing.id);
        return;
      }

      // If single choice, remove other votes first
      if (!isMultipleChoice) {
        const { data: options } = await supabase
          .from("poll_options")
          .select("id")
          .eq("poll_id", pollId);

        if (options) {
          const optIds = options.map((o) => o.id);
          await supabase
            .from("poll_votes")
            .delete()
            .in("poll_option_id", optIds)
            .eq("user_id", user.id);
        }
      }

      const { error } = await supabase
        .from("poll_votes")
        .insert({ poll_option_id: pollOptionId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["poll-by-message", vars.messageId] });
    },
    onError: () => {
      toast.error("Erro ao votar");
    },
  });
}
