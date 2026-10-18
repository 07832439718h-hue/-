import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredPWAInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && window.deferredPWAInstallPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already running as installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // Detect if running inside an iframe (like AI Studio preview)
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // Detect iOS devices (Safari on iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if the prompt was already captured earlier on window
    if (window.deferredPWAInstallPrompt && !deferredPrompt) {
      setDeferredPrompt(window.deferredPWAInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      console.log('[PWA Hook] beforeinstallprompt captured and ready');
    };

    const handleCustomInstallable = (e: any) => {
      const promptEvent = e.detail || window.deferredPWAInstallPrompt;
      if (promptEvent) {
        setDeferredPrompt(promptEvent);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = null;
      console.log('[PWA Hook] App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installable', handleCustomInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-installable', handleCustomInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const activePrompt = deferredPrompt || window.deferredPWAInstallPrompt;

    if (!activePrompt) {
      console.warn('[PWA Hook] install called but no deferredPrompt available');
      return 'unavailable';
    }

    try {
      // 1. Show the browser's native install prompt dialog directly!
      await activePrompt.prompt();

      // 2. Wait for the user to respond to the prompt
      const { outcome } = await activePrompt.userChoice;
      console.log('[PWA Hook] User choice outcome:', outcome);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.deferredPWAInstallPrompt = null;
        return 'accepted';
      }

      return 'dismissed';
    } catch (err) {
      console.error('[PWA Hook] Failed to execute prompt():', err);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!(deferredPrompt || (typeof window !== 'undefined' && window.deferredPWAInstallPrompt)),
    isInstalled,
    isIOS,
    isInIframe,
    install,
    hasNativePrompt: !!(deferredPrompt || (typeof window !== 'undefined' && window.deferredPWAInstallPrompt)),
  };
}
