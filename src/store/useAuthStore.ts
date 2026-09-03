// src/store/useAuthStore.ts
// Simple React hook-based auth store using Supabase session

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '../types/user';

export type AuthState = {
  session: any | null;
  user: User | null;
  loading: boolean;
  error: string | null;
};

let _listeners: Array<(state: AuthState) => void> = [];
let _state: AuthState = { session: null, user: null, loading: true, error: null };

function notify(newState: AuthState) {
  _state = newState;
  _listeners.forEach(fn => fn(newState));
}

// Bootstrap auth once at module level
supabase.auth.getSession().then(({ data }) => {
  notify({ ..._state, session: data.session, loading: false });
});

supabase.auth.onAuthStateChange((_event, session) => {
  notify({ ..._state, session, loading: false });
});

/**
 * Lightweight auth store hook — no external state library required.
 * For more complex use cases, replace with zustand or jotai.
 */
export function useAuthStore(): AuthState & {
  signOut: () => Promise<void>;
  setError: (msg: string | null) => void;
} {
  const [state, setState] = useState<AuthState>(_state);

  useEffect(() => {
    _listeners.push(setState);
    setState(_state); // sync on mount in case state changed before subscription
    return () => {
      _listeners = _listeners.filter(fn => fn !== setState);
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    notify({ session: null, user: null, loading: false, error: null });
  }, []);

  const setError = useCallback((msg: string | null) => {
    notify({ ..._state, error: msg });
  }, []);

  return { ...state, signOut, setError };
}
