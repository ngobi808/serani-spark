import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * The category list is derived from the live product data, so a category you add
 * in admin shows up here with no code change. It's fetched once per page load and
 * shared, so the menu drawer and the catalogue don't each download the whole
 * catalogue just to learn the category names.
 */
let cache: Promise<string[]> | null = null;

function loadCategories(): Promise<string[]> {
  if (!cache) {
    cache = api
      .getProducts()
      .then((res) => Array.from(new Set(res.products.map((p) => p.category))).filter(Boolean).sort())
      .catch((err) => {
        cache = null; // don't remember a failure, so the next attempt really retries
        throw err;
      });
  }
  return cache;
}

export type CategoriesStatus = 'loading' | 'ready' | 'error';

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<CategoriesStatus>('loading');

  const load = useCallback(() => {
    let active = true;
    setStatus('loading');
    loadCategories()
      .then((list) => {
        if (!active) return;
        setCategories(list);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return { categories, status, reload: load };
}
