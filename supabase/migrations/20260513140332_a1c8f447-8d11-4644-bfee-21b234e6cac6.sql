
CREATE OR REPLACE FUNCTION public.get_unread_feed(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH
  -- Channels the user is member of in this workspace
  user_channels AS (
    SELECT c.id, c.name, c.is_private,
           COALESCE(crs.last_read_at, 'epoch'::timestamptz) AS last_read_at
    FROM public.channels c
    JOIN public.channel_members cm ON cm.channel_id = c.id AND cm.user_id = v_user_id
    LEFT JOIN public.channel_read_status crs
      ON crs.channel_id = c.id AND crs.user_id = v_user_id
    WHERE c.workspace_id = p_workspace_id
  ),
  channel_unread AS (
    SELECT uc.id, uc.name, uc.is_private,
           COUNT(m.id) AS unread_count,
           (SELECT jsonb_build_object(
              'content', lm.content,
              'created_at', lm.created_at,
              'sender_name', p.display_name,
              'sender_avatar', p.avatar_url
            )
            FROM public.messages lm
            LEFT JOIN public.profiles p ON p.id = lm.user_id
            WHERE lm.channel_id = uc.id
            ORDER BY lm.created_at DESC
            LIMIT 1) AS last_message
    FROM user_channels uc
    LEFT JOIN public.messages m
      ON m.channel_id = uc.id
     AND m.user_id <> v_user_id
     AND m.created_at > uc.last_read_at
    GROUP BY uc.id, uc.name, uc.is_private
    HAVING COUNT(m.id) > 0
  ),
  -- Direct messages
  user_dms AS (
    SELECT dm.id,
           CASE WHEN dm.user1_id = v_user_id THEN dm.user2_id ELSE dm.user1_id END AS other_user_id,
           COALESCE(drs.last_read_at, 'epoch'::timestamptz) AS last_read_at
    FROM public.direct_messages dm
    LEFT JOIN public.dm_read_status drs
      ON drs.dm_id = dm.id AND drs.user_id = v_user_id
    WHERE dm.workspace_id = p_workspace_id
      AND (dm.user1_id = v_user_id OR dm.user2_id = v_user_id)
  ),
  dm_unread AS (
    SELECT ud.id,
           ud.other_user_id,
           op.display_name AS other_name,
           op.avatar_url AS other_avatar,
           COUNT(dmm.id) AS unread_count,
           (SELECT jsonb_build_object(
              'content', lm.content,
              'created_at', lm.created_at,
              'sender_name', p.display_name,
              'sender_avatar', p.avatar_url
            )
            FROM public.dm_messages lm
            LEFT JOIN public.profiles p ON p.id = lm.user_id
            WHERE lm.dm_id = ud.id
            ORDER BY lm.created_at DESC
            LIMIT 1) AS last_message
    FROM user_dms ud
    LEFT JOIN public.profiles op ON op.id = ud.other_user_id
    LEFT JOIN public.dm_messages dmm
      ON dmm.dm_id = ud.id
     AND dmm.user_id <> v_user_id
     AND dmm.created_at > ud.last_read_at
    GROUP BY ud.id, ud.other_user_id, op.display_name, op.avatar_url
    HAVING COUNT(dmm.id) > 0
  ),
  -- DM groups (membership-based, last 24h heuristic preserved)
  user_groups AS (
    SELECT g.id, g.name
    FROM public.dm_groups g
    JOIN public.dm_group_members gm ON gm.group_id = g.id AND gm.user_id = v_user_id
    WHERE g.workspace_id = p_workspace_id
  ),
  group_unread AS (
    SELECT ug.id, ug.name,
           COUNT(gm.id) AS unread_count,
           (SELECT jsonb_build_object(
              'content', lm.content,
              'created_at', lm.created_at,
              'sender_name', p.display_name,
              'sender_avatar', p.avatar_url
            )
            FROM public.dm_group_messages lm
            LEFT JOIN public.profiles p ON p.id = lm.user_id
            WHERE lm.group_id = ug.id
            ORDER BY lm.created_at DESC
            LIMIT 1) AS last_message
    FROM user_groups ug
    LEFT JOIN public.dm_group_messages gm
      ON gm.group_id = ug.id
     AND gm.user_id <> v_user_id
     AND gm.created_at > (now() - interval '24 hours')
    GROUP BY ug.id, ug.name
    HAVING COUNT(gm.id) > 0
  )
  SELECT jsonb_agg(item ORDER BY (item->'last_message'->>'created_at') DESC NULLS LAST)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'type', 'channel',
      'id', id,
      'name', '#' || name,
      'icon', CASE WHEN is_private THEN '🔒' ELSE '#' END,
      'unread_count', unread_count,
      'last_message', last_message
    ) AS item
    FROM channel_unread
    UNION ALL
    SELECT jsonb_build_object(
      'type', 'dm',
      'id', id,
      'name', COALESCE(other_name, 'Usuário'),
      'icon', other_avatar,
      'unread_count', unread_count,
      'last_message', last_message
    )
    FROM dm_unread
    UNION ALL
    SELECT jsonb_build_object(
      'type', 'group',
      'id', id,
      'name', COALESCE(name, 'Grupo'),
      'icon', '👥',
      'unread_count', unread_count,
      'last_message', last_message
    )
    FROM group_unread
  ) merged;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_feed(uuid) TO authenticated;
