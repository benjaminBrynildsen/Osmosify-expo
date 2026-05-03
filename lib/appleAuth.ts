import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Sign in with Apple → Supabase.
 *
 * Flow: anonymous Supabase user (created on first launch) →
 * link to Apple identity via signInWithIdToken({ provider: 'apple', token, nonce }).
 * All previously-saved local data carries over because Supabase keeps
 * the same user.id when linking.
 */

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<
  { ok: true; userId: string } | { ok: false; reason: string }
> {
  if (!supabase) {
    return { ok: false, reason: 'Supabase not configured' };
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, reason: 'No identity token from Apple' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return { ok: false, reason: error.message };
    }

    return { ok: true, userId: data.user?.id || '' };
  } catch (err: any) {
    if (err?.code === 'ERR_CANCELED') {
      return { ok: false, reason: 'cancelled' };
    }
    return { ok: false, reason: String(err?.message || err) };
  }
}
