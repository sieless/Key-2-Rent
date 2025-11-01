'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
    setIsVisible(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000] max-w-sm rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold">Install Timelaine</p>
          <p className="text-sm text-muted-foreground">Keep the latest features and branding on your device.</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="-mr-1 rounded p-1 text-muted-foreground transition hover:text-foreground"
        >
          <span className="sr-only">Dismiss</span>
          ×
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={install}>Install</Button>
        <Button variant="ghost" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
