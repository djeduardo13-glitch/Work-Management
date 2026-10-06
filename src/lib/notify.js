import { toast } from '../components/toast.js';

/** Notifica del telefono (se permessa), altrimenti un toast nell'app. */
export function notify(text, tag) {
  if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification('Work Manager', { body: text, icon: './icon-192.png', tag }))
      .catch(() => toast(text));
  } else {
    toast(text);
  }
}
