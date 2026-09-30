(() => {
  const prompt = document.getElementById('install-prompt');
  const installButton = document.getElementById('install-app');
  const dismissButton = document.getElementById('dismiss-install');
  if (!prompt || !installButton || !dismissButton) return;

  let deferredPrompt = null;
  const dismissedKey = 'world69:pwa-install-dismissed';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw-v2.js?v=20260930-teacher-cache-v9').catch(() => {}));
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (!isStandalone && sessionStorage.getItem(dismissedKey) !== '1') prompt.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    prompt.hidden = true;
  });

  dismissButton.addEventListener('click', () => {
    sessionStorage.setItem(dismissedKey, '1');
    prompt.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    prompt.hidden = true;
    deferredPrompt = null;
  });
})();
