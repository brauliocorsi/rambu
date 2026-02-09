import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNotificationPreferences } from './useProfile';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { data: notifPrefs } = useNotificationPreferences();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (options: NotificationOptions): Promise<boolean> => {
    // Check if notifications are enabled and permitted
    if (!isSupported || permission !== 'granted') return false;
    if (!(notifPrefs as any)?.push_notifications) return false;
    
    // Don't show if user is in DND mode
    // This would need to check the profile status

    // Don't show if tab is active
    if (document.visibilityState === 'visible') return false;

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        badge: '/favicon.ico',
        requireInteraction: false,
      });

      // Play sound if enabled
      if (notifPrefs?.sound_enabled) {
        playNotificationSound(notifPrefs.sound_volume || 0.5);
      }

      // Handle click - focus the tab
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission, notifPrefs]);

  const showMessageNotification = useCallback((
    senderName: string,
    message: string,
    channelName?: string,
    avatarUrl?: string
  ) => {
    const title = channelName 
      ? `${senderName} em #${channelName}`
      : senderName;
    
    showNotification({
      title,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: avatarUrl,
      tag: channelName || 'dm',
    });
  }, [showNotification]);

  const showDMNotification = useCallback((
    senderName: string,
    message: string,
    avatarUrl?: string
  ) => {
    showNotification({
      title: `Nova mensagem de ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: avatarUrl,
      tag: `dm-${senderName}`,
    });
  }, [showNotification]);

  return {
    isSupported,
    permission,
    isEnabled: permission === 'granted' && (notifPrefs as any)?.push_notifications,
    requestPermission,
    showNotification,
    showMessageNotification,
    showDMNotification,
  };
};

// Helper to play notification sound
const playNotificationSound = (volume: number) => {
  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = volume * 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};
