// Supabase Edge Function: hello
//
// ⚠️  YOU MUST DEPLOY THIS YOURSELF — the build pipeline does NOT deploy Edge Functions.
//
// =====================================================================
// HOW TO DEPLOY (you MUST do one of these — the function will NOT
// appear in your Supabase dashboard until you do):
// =====================================================================
//
// ── Option A: Supabase CLI (recommended) ──────────────────────────────
//
//   1. Install the CLI if you haven't:
//        npm i -g supabase
//
//   2. Log in:
//        supabase login
//
//   3. Link your project (run from the repo root):
//        supabase link --project-ref <your-project-ref>
//      (find your project ref in the Supabase dashboard URL:
//       https://supabase.com/dashboard/project/<your-project-ref>)
//
//   4. Deploy the function:
//        supabase functions deploy hello
//
//   5. After deploy, verify in the dashboard under Edge Functions
//      that "hello" is listed and its URL is:
//        https://<your-project-ref>.supabase.co/functions/v1/hello
//
// ── Option B: Supabase Dashboard (manual paste) ───────────────────────
//
//   1. Go to https://supabase.com/dashboard → select your project
//   2. In the left sidebar click "Edge Functions"
//   3. Click "Create a new function"
//   4. Set the name to exactly: hello
//   5. Copy-paste this ENTIRE file as the function body
//   6. Click Deploy
//   7. Confirm the function appears in the list with status "Active"
//
// =====================================================================
// TROUBLESHOOTING
// =====================================================================
//
// • "I deployed but the function doesn't show up"
//   → Refresh the dashboard. If using the CLI, check the output for errors.
//     Run: supabase functions list
//
// • CORS / network error when calling from the browser
//   → The function includes CORS headers. If you still get errors,
//     make sure you deployed successfully and the URL matches.
//
// • 404 when calling the function
//   → The function is NOT deployed yet. Follow the steps above.
//
// • 401 Unauthorized
//   → You must be signed in. The app sends the JWT automatically.
//

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight — must return 200 with all CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfigured: missing env vars' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with the user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized: invalid or expired JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Success response
    return new Response(
      JSON.stringify({
        ok: true,
        userId: user.id,
        message: 'hello from edge',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
