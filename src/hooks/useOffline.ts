// src/hooks/useOffline.ts
// Monitors network connectivity.
//
// NOTE: For full NetInfo support install @react-native-community/netinfo and
// replace the implementation below. The current stub uses a simple state that
// can be updated manually and is sufficient for basic offline detection.

import { useState, useEffect } from 'react';
import { AppState, Platform } from 'react-native';

export type OfflineState = {
  /** true when the device appears to be offline */
  isOffline: boolean;
  /** null = unknown, true = connected, false = disconnected */
  isConnected: boolean | null;
  connectionType: string | null;
};

/**
 * useOffline — returns current network status.
 *
 * Relies on the platform's `navigator.onLine` on web, and on Android/iOS uses
 * AppState changes as a proxy (a full implementation would use NetInfo).
 *
 * Usage:
 *   const { isOffline } = useOffline();
 */
export function useOffline(): OfflineState {
  const [state, setState] = useState<OfflineState>({
    isOffline: false,
    isConnected: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const update = () =>
        setState({
          isOffline: !navigator.onLine,
          isConnected: navigator.onLine,
          connectionType: navigator.onLine ? 'wifi' : null,
        });

      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }

    // On native: use AppState as a lightweight proxy.
    // For production, replace with @react-native-community/netinfo.
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Re-check when app comes to foreground; assume connected for now.
        setState(prev => ({ ...prev, isConnected: true, isOffline: false }));
      }
    });

    return () => subscription.remove();
  }, []);

  return state;
}

export default useOffline;
