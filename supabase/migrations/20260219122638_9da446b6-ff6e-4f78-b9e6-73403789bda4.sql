
CREATE POLICY "Users can delete their own mentions"
ON public.message_mentions
FOR DELETE
USING (mentioned_user_id = auth.uid());
