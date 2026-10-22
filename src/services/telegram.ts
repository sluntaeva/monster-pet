interface TelegramWebApp {
  initData?: string; ready?: () => void; expand?: () => void;
  contentSafeAreaInset?: { top?: number; bottom?: number };
  safeAreaInset?: { top?: number; bottom?: number };
  onEvent?: (event: string, callback: () => void) => void;
}
export async function prepareTelegram(): Promise<void> {
  const telegramWindow = window as Window & { Telegram?: { WebApp?: TelegramWebApp } };
  if (!telegramWindow.Telegram?.WebApp && new URLSearchParams(location.hash.slice(1)).has('tgWebAppData')) {
    await new Promise<void>(resolve => {
      const script = document.createElement('script'); script.src = 'https://telegram.org/js/telegram-web-app.js'; script.async = true;
      const timer = setTimeout(resolve, 5000);
      script.onload = script.onerror = () => { clearTimeout(timer); resolve(); };
      document.head.append(script);
    });
  }
  const app = telegramWindow.Telegram?.WebApp;
  if (!app) return;
  const syncInsets = () => {
    const bottom = Math.max(app.contentSafeAreaInset?.bottom ?? 0, app.safeAreaInset?.bottom ?? 0);
    const top = Math.max(app.contentSafeAreaInset?.top ?? 0, app.safeAreaInset?.top ?? 0);
    document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
    document.documentElement.style.setProperty('--tg-safe-top', `${top}px`);
  };
  syncInsets(); app.onEvent?.('safeAreaChanged', syncInsets); app.onEvent?.('contentSafeAreaChanged', syncInsets);
  app.ready?.(); app.expand?.();
}
