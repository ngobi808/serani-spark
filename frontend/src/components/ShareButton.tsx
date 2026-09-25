import { useState } from 'react';

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  label?: string;
}

export function ShareButton({ title, text, url, label = 'Share' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Prefer the native share sheet (works great on mobile - WhatsApp, SMS, etc.)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled the share sheet - not an error, do nothing.
      }
      return;
    }

    // Desktop fallback: copy the link to the clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare) - last resort, open a prompt so they can copy manually.
      window.prompt('Copy this link:', url);
    }
  }

  return (
    <button className="ss-btn-secondary" onClick={handleShare} type="button">
      {copied ? 'Link copied ✓' : `🔗 ${label}`}
    </button>
  );
}
