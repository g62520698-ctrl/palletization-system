import type { DeviceProfile, QualityLevel } from './types';

export function detectDevice(): DeviceProfile {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipod|mobile/i.test(ua);
  const isTablet = /ipad|tablet|playbook|silk/i.test(ua) ||
    (isMobile && Math.min(window.innerWidth, window.innerHeight) > 600);

  let quality: QualityLevel = 'high';
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  if (isMobile) {
    quality = 'low';
  } else if (isTablet) {
    quality = 'medium';
  } else {
    // Check for lower-end desktops
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8;
    if (cores <= 2 || memory <= 2) {
      quality = 'medium';
    } else if (cores <= 4 || memory <= 4) {
      quality = 'medium';
    }
  }

  return { quality, isMobile, isTablet, pixelRatio };
}

export function getQualitySettings(quality: QualityLevel) {
  switch (quality) {
    case 'high':
      return {
        shadows: true,
        shadowMapSize: 1024,
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        maxLights: 4,
        ambientIntensity: 0.6,
        directionalIntensity: 0.8,
      };
    case 'medium':
      return {
        shadows: true,
        shadowMapSize: 512,
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        maxLights: 3,
        ambientIntensity: 0.7,
        directionalIntensity: 0.6,
      };
    case 'low':
      return {
        shadows: false,
        shadowMapSize: 256,
        antialias: false,
        pixelRatio: 1,
        maxLights: 2,
        ambientIntensity: 0.8,
        directionalIntensity: 0.5,
      };
  }
}
