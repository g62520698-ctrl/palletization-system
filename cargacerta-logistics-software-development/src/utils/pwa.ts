/**
 * CargaCerta v2 - Registro do Service Worker PWA
 */

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registrado:', registration.scope);

          // Verificar atualizações
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  // Nova versão disponível - poderia mostrar notificação
                  console.log('Nova versão do app disponível');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('Falha ao registrar SW:', error);
        });
    });
  }
}

let deferredPrompt: any = null;

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export async function installApp(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return result.outcome === 'accepted';
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}
