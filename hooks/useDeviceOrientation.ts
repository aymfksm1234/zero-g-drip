'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DeviceOrientationData {
  alpha: number | null; // Z軸回転 (0-360)
  beta: number | null;  // X軸傾き (-180~180, 前後)
  gamma: number | null; // Y軸傾き (-90~90, 左右)
  isSupported: boolean;
  permissionState: 'unknown' | 'granted' | 'denied' | 'requesting';
  requestPermission: () => Promise<void>;
}

export function useDeviceOrientation(): DeviceOrientationData {
  const [data, setData] = useState<Omit<DeviceOrientationData, 'requestPermission'>>({
    alpha: null,
    beta: null,
    gamma: null,
    isSupported: false,
    permissionState: 'unknown',
  });

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    setData(prev => ({
      ...prev,
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      isSupported: true,
    }));
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires explicit permission
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      setData(prev => ({ ...prev, permissionState: 'requesting' }));
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission === 'granted') {
          setData(prev => ({ ...prev, permissionState: 'granted', isSupported: true }));
          window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
          setData(prev => ({ ...prev, permissionState: 'denied' }));
        }
      } catch {
        setData(prev => ({ ...prev, permissionState: 'denied' }));
      }
    } else {
      // Android / non-iOS: no permission needed
      setData(prev => ({ ...prev, permissionState: 'granted', isSupported: true }));
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }, [handleOrientation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const needsPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function';

    if (!needsPermission) {
      // Android: auto-start
      window.addEventListener('deviceorientation', handleOrientation, true);
      setData(prev => ({ ...prev, permissionState: 'granted', isSupported: true }));
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [handleOrientation]);

  return { ...data, requestPermission };
}
