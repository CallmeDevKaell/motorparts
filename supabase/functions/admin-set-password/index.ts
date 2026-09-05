// Supabase Edge Function: admin-set-password
// Lets an authenticated admin set another user's password + username using the
// service_role key, which must never be exposed to the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Scoped to the caller's own JWT, used only to identify who is calling.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: 'Invalid or expired session' }, 401);
    }

    // Privileged client for the admin check and the actual password/profile update.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return json({ error: 'Forbidden: admin role required' }, 403);
    }

    const { userId, password, username } = await req.json();

    if (!userId || !password) {
      return json({ error: 'userId and password are required' }, 400);
    }

    if (typeof password !== 'string' || password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (updateAuthError) {
      return json({ error: updateAuthError.message }, 400);
    }

    const profileUpdate: Record<string, unknown> = { is_approved: true };
    if (username) profileUpdate.username = username;

    const { error: profileUpdateError } = await adminClient
      .from('users')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileUpdateError) {
      return json({ error: profileUpdateError.message }, 400);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
