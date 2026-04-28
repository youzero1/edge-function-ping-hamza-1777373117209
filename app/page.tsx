'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [edgeResult, setEdgeResult] = useState<string | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [edgeLoading, setEdgeLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const missingEnv = !supabase;

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError(error.message);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('An unexpected error occurred');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setEdgeResult(null);
    setEdgeError(null);
  }

  async function callEdgeFunction() {
    if (!supabase) return;
    setEdgeResult(null);
    setEdgeError(null);
    setEdgeLoading(true);

    try {
      // Get the current session to obtain the access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setEdgeError('No active session. Please sign in again.');
        setEdgeLoading(false);
        return;
      }

      // Use raw fetch to avoid the supabase-js Relay/CORS issues
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setEdgeError('Missing Supabase environment variables.');
        setEdgeLoading(false);
        return;
      }

      const functionUrl = `${supabaseUrl}/functions/v1/hello`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ test: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEdgeError(data?.error || `HTTP ${response.status}: ${response.statusText}`);
      } else {
        setEdgeResult(JSON.stringify(data, null, 2));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEdgeError(`Failed to call Edge Function: ${err.message}`);
      } else {
        setEdgeError('An unexpected error occurred calling the edge function');
      }
    } finally {
      setEdgeLoading(false);
    }
  }

  if (initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400 text-lg">Loading…</p>
      </main>
    );
  }

  if (missingEnv) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-red-700/40 bg-red-950/30 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Supabase Not Configured</h1>
          <p className="text-gray-300 text-sm leading-relaxed">
            Set <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your{' '}
            <code className="bg-gray-800 px-1 rounded">.env.local</code> file, then restart the dev server.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Edge Function Ping</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in and invoke your Supabase Edge Function
          </p>
        </div>

        {!user ? (
          /* Auth Form */
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg">
            <div className="mb-5 flex rounded-lg bg-gray-800/60 p-1">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  authMode === 'signin'
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  authMode === 'signup'
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <div className="rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading
                  ? 'Please wait…'
                  : authMode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>
          </div>
        ) : (
          /* Signed In */
          <div className="space-y-5">
            {/* User info bar */}
            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-4 shadow-lg">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Signed in as</p>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-200">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
              >
                Sign Out
              </button>
            </div>

            {/* Call Edge Function */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-1">Invoke Edge Function</h2>
              <p className="text-sm text-gray-400 mb-5">
                Calls <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-emerald-400">/functions/v1/hello</code> with your auth token.
              </p>

              <button
                type="button"
                onClick={callEdgeFunction}
                disabled={edgeLoading}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {edgeLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Calling…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    Call Edge Function
                  </>
                )}
              </button>

              {edgeError && (
                <div className="mt-4 rounded-lg border border-red-700/40 bg-red-950/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-1">Error</p>
                  <p className="text-sm text-red-400 break-all">{edgeError}</p>
                </div>
              )}

              {edgeResult && (
                <div className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-1">Response</p>
                  <pre className="text-sm text-emerald-300 whitespace-pre-wrap break-all font-mono">
                    {edgeResult}
                  </pre>
                </div>
              )}
            </div>

            {/* Network hint */}
            <div className="rounded-lg border border-gray-800/60 bg-gray-900/30 px-4 py-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 Open <span className="font-medium text-gray-400">DevTools → Network</span> and look for a request to{' '}
                <code className="text-gray-400">/functions/v1/hello</code> on your Supabase project URL.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
