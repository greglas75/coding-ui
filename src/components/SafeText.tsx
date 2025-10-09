/**
 * 🛡️ SafeText Component
 *
 * Safely displays user-generated content by sanitizing HTML.
 * Prevents XSS (Cross-Site Scripting) attacks.
 *
 * Example Attacks Prevented:
 * - <script>alert('hack')</script>
 * - <img src=x onerror=alert(1)>
 * - <a href="javascript:alert(1)">Click me</a>
 *
 * Business Benefit:
 * - Protects users from malicious content
 * - Prevents phishing attacks
 * - Maintains trust and security
 */

import DOMPurify from 'isomorphic-dompurify';
import { memo } from 'react';

interface SafeTextProps {
  /** The content to display (may contain HTML) */
  content: string;
  /** Allow basic formatting tags (b, i, u, strong, em) */
  allowBasicFormatting?: boolean;
  /** Optional className for styling */
  className?: string;
  /** HTML element type to render */
  as?: 'span' | 'div' | 'p';
}

/**
 * Safely display user-generated content with XSS protection
 *
 * Usage:
 * ```tsx
 * // Basic usage (strips all HTML):
 * <SafeText content={userInput} />
 *
 * // Allow basic formatting:
 * <SafeText content={userInput} allowBasicFormatting />
 *
 * // With custom styling:
 * <SafeText content={userInput} className="text-lg font-bold" />
 * ```
 */
export const SafeText = memo(function SafeText({
  content,
  allowBasicFormatting = false,
  className = '',
  as = 'span',
}: SafeTextProps) {
  // Sanitize content to prevent XSS
  const sanitized = DOMPurify.sanitize(content || '', {
    ALLOWED_TAGS: allowBasicFormatting
      ? ['b', 'i', 'u', 'strong', 'em', 'p', 'br']
      : [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  const Element = as;

  return (
    <Element
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
});

/**
 * Safely display answer text (common use case)
 */
export function SafeAnswerText({ text, className = '' }: { text: string; className?: string }) {
  return <SafeText content={text} className={className} />;
}

/**
 * Safely display translation text (common use case)
 */
export function SafeTranslationText({ text, className = '' }: { text: string; className?: string }) {
  return <SafeText content={text || ''} className={className} />;
}
