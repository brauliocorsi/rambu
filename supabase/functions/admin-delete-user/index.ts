import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

/**
 * Permanently delete a user account.
 * Caller must be a super_admin OR be deleting their own account.
 * The profile is anonymized via DB trigger, then the auth.users row is removed.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const actorId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const target_user_id = (body?.target_user_id as string) || actorId

    const admin = createClient(SUPABASE_URL, SERVICE)

    if (target_user_id !== actorId) {
      const { data: isSuper } = await admin
        .from('super_admins').select('id').eq('user_id', actorId).maybeSingle()
      if (!isSuper) {
        return new Response(JSON.stringify({ error: 'Forbidden — only super admins can delete other users' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 1. Anonymize profile (trigger handles field nulling) — keeps message history intact
    await admin.from('profiles').update({ is_deleted: true }).eq('id', target_user_id)

    // 2. Remove from all workspaces (cleans channels/dms/groups via existing trigger)
    await admin.from('workspace_members').delete().eq('user_id', target_user_id)

    // 3. Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id)
    if (delErr) {
      // Continue: profile already anonymized
      console.error('auth delete error:', delErr.message)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})