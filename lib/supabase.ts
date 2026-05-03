import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url = (Constants.expoConfig?.extra as any)?.supabaseUrl as string | undefined;
const anonKey = (Constants.expoConfig?.extra as any)?.supabaseAnonKey as string | undefined;

/**
 * Supabase client for Noah.
 * URL + anon key live in app.json `extra` (paste them in before EAS build).
 *
 * Auth strategy: anonymous-by-default. On first launch each device gets
 * an anonymous Supabase user; everything (children, words, sessions)
 * is owned by that anonymous UUID. Later, the user can "Sign in with
 * Apple" from Settings — we link the Apple identity to the anonymous
 * user so all data carries over.
 */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage as any,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseConfigured = !!supabase;
