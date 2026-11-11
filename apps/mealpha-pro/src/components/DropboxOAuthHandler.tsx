import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { useStore } from '../lib/store';

type PendingDropboxAuth = {
  appKey: string;
  verifier: string;
  state: string;
  createdAt: number;
};

export default function DropboxOAuthHandler() {
  const { data, settings, setLocalSettings } = useStore();
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !data) return;
    let active = true;

    const completeDropboxSignIn = async (url: string) => {
      let callback: URL;
      try {
        callback = new URL(url);
      } catch {
        return;
      }
      if (callback.protocol !== 'com.mealpha.pro:' || callback.hostname !== 'oauth' || callback.pathname !== '/dropbox/callback') return;

      const pendingRaw = localStorage.getItem('mealpha.dropbox.pending');
      if (!pendingRaw) {
        toast.error('Dropbox sign-in session was not found. Please try connecting again.');
        return;
      }

      try {
        const pending = JSON.parse(pendingRaw) as PendingDropboxAuth;
        if (!pending.appKey || !pending.verifier || !pending.state || Date.now() - pending.createdAt > 10 * 60 * 1000) {
          throw new Error('Dropbox sign-in expired. Please try again.');
        }
        const state = callback.searchParams.get('state');
        if (!state || state !== pending.state) throw new Error('Dropbox sign-in state validation failed.');
        const oauthError = callback.searchParams.get('error');
        if (oauthError) throw new Error(callback.searchParams.get('error_description') || oauthError);
        const code = callback.searchParams.get('code');
        if (!code) throw new Error('Dropbox did not return an authorization code.');

        const redirectUri = 'https://apkswap.github.io/MeAlphaPro/oauth/dropbox/callback/';
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: pending.appKey,
            redirect_uri: redirectUri,
            code_verifier: pending.verifier
          })
        });
        const token = await response.json();
        if (!response.ok) throw new Error(token.error_description || token.error || 'Dropbox token exchange failed.');

        const accountResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
          body: 'null'
        });
        const account = accountResponse.ok ? await accountResponse.json() : null;
        const nextSettings = {
          ...settingsRef.current,
          dropboxAppKey: pending.appKey,
          dropboxAccessToken: token.access_token,
          dropboxRefreshToken: token.refresh_token || '',
          dropboxExpiresAt: Date.now() + Number(token.expires_in || 14400) * 1000,
          dropboxAccountName: account?.name?.display_name || ''
        };
        setLocalSettings(nextSettings);
        localStorage.removeItem('mealpha.dropbox.pending');
        await Browser.close().catch(() => undefined);
        toast.success(settingsRef.current.language === 'fa' ? 'حساب Dropbox متصل شد.' : 'Dropbox connected.');
      } catch (error) {
        localStorage.removeItem('mealpha.dropbox.pending');
        await Browser.close().catch(() => undefined);
        toast.error(error instanceof Error ? error.message : 'Dropbox sign-in failed.');
      }
    };

    let listener: { remove: () => Promise<void> } | undefined;
    void (async () => {
      listener = await App.addListener('appUrlOpen', event => {
        if (active) void completeDropboxSignIn(event.url);
      });
      const launch = await App.getLaunchUrl();
      if (active && launch?.url) await completeDropboxSignIn(launch.url);
    })();

    return () => {
      active = false;
      void listener?.remove();
    };
  }, [Boolean(data), setLocalSettings]);

  return null;
}
