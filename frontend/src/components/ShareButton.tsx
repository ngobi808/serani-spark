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
    // Try the native share sheet first (mobile, and some desktop browsers).
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return; // user picked an app - done, no further feedback needed
      } catch {
        // Share failed, was cancelled, or no share targets exist on this device -
        // fall through to the clipboard copy below instead of doing nothing.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked - last resort, let them copy manually.
      window.prompt('Copy this link:', url);
    }
  }

  return (
    <button className="ss-btn-secondary" onClick={handleShare} type="button">
      {copied ? 'Link copied ✓' : `🔗 ${label}`}
    </button>
  );
}
