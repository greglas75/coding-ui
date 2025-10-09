/**
 * Skip Navigation Component for Accessibility
 *
 * Allows keyboard users to skip repetitive navigation.
 * Essential for WCAG 2.1 AA compliance.
 */

export function SkipNavigation() {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] px-4 py-2 bg-blue-600 text-white rounded-md shadow-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

/**
 * Skip links for multi-section pages
 */
export function SkipLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 z-[9999] flex flex-col gap-2">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
