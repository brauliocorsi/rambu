import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const actorId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const { workspace_id, target_user_id, reason } = body as {
      workspace_id?: string
      target_user_id?: string
      reason?: string
    }

    if (!workspace_id || !target_user_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id and target_user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (target_user_id === actorId) {
      return new Response(JSON.stringify({ error: 'Cannot ban yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is workspace admin
    const { data: actorMember } = await userClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', actorId)
      .maybeSingle()

    if (!actorMember || actorMember.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE)

    // Insert ban
    const { error: banErr } = await admin.from('workspace_bans').upsert(
      {
        workspace_id,
        user_id: target_user_id,
        banned_by: actorId,
        reason: reason ?? null,
      },
      { onConflict: 'workspace_id,user_id' },
    )
    if (banErr) throw banErr

    // Remove from workspace (trigger will cascade clean channel/dm/group access)
    await admin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspace_id)
      .eq('user_id', target_user_id)

    // Audit log
    await admin.from('audit_logs').insert({
      workspace_id,
      actor_id: actorId,
      action: 'user_banned',
      target_type: 'user',
      target_id: target_user_id,
      metadata: { reason: reason ?? null },
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})