/**
 * 📱 Media Query Hooks
 *
 * React hooks for responsive design and device detection.
 *
 * Benefits:
 * - Conditional rendering based on screen size
 * - Optimized layouts for each device
 * - Better mobile/tablet/desktop UX
 * - Touch vs mouse detection
 */

import { useEffect, useState } from 'react';

/**
 * Hook for matching media queries
 *
 * Usage:
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 768px)');
 *
 * return isMobile ? <MobileView /> : <DesktopView />;
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Listen for changes
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks
 *
 * Usage:
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useBreakpoint();
 *
 * if (isMobile) {
 *   return <MobileFilterDrawer />;
 * }
 * ```
 */
export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTouch = useMediaQuery('(hover: none) and (pointer: coarse)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isSmallMobile: useMediaQuery('(max-width: 375px)'),
    isLargeMobile: useMediaQuery('(min-width: 376px) and (max-width: 767px)'),
    prefersReducedMotion,
  };
}

/**
 * Get current breakpoint name
 */
export function useCurrentBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const { isMobile, isTablet } = useBreakpoint();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
