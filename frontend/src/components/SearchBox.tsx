import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const DEBOUNCE_MS = 300;

/**
 * Lives in the sticky header, so it's reachable from every page. The URL
 * (/?q=wipes) is the single source of truth for the active search: results are
 * shareable, the back button works, and the catalogue just reads the same param.
 *
 * Searching always looks across the whole catalogue; picking a category from the
 * menu replaces any search text, so you're never stuck on an empty
 * "wipes inside Tissue" result with no obvious reason.
 */
export function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const onCatalogue = location.pathname === '/';
  const urlQuery = onCatalogue ? (searchParams.get('q') ?? '') : '';

  const [text, setText] = useState(urlQuery);
  // The last value THIS component put into the URL. Lets us tell "the URL changed
  // because of me" (ignore it) from "the URL changed some other way, e.g. the back
  // button or a category link" (reflect it in the box). Without this, a slow URL
  // update can overwrite characters the person typed in the meantime.
  const lastPushed = useRef(urlQuery);
  const timer = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setText(urlQuery);
    }
  }, [urlQuery]);

  function push(value: string) {
    const trimmed = value.trim();
    lastPushed.current = trimmed;
    // While already on the catalogue, replace the history entry so typing "wipes"
    // doesn't leave five back-button stops. From any other page, add a real entry
    // so Back returns to where they were.
    navigate({ pathname: '/', search: trimmed ? `?${new URLSearchParams({ q: trimmed })}` : '' }, { replace: onCatalogue });
  }

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (text.trim() === lastPushed.current) return; // nothing new to apply
    timer.current = window.setTimeout(() => push(text), DEBOUNCE_MS);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.clearTimeout(timer.current);
    push(text);
    inputRef.current?.blur(); // closes the phone keyboard so the results are visible
  }

  function handleClear() {
    setText('');
    inputRef.current?.focus();
  }

  return (
    <form className="ss-search" role="search" onSubmit={handleSubmit}>
      <svg className="ss-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <line x1="15.5" y1="15.5" x2="21" y2="21" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={100}
        aria-label="Search products"
        placeholder="Search all products or SKU..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text && (
        <button type="button" className="ss-search-clear" aria-label="Clear search" onClick={handleClear}>
          ✕
        </button>
      )}
    </form>
  );
}
