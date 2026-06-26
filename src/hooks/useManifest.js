
import { useState, useEffect } from 'react';

let manifestCache = null;

export function useManifest() {
  const [manifest, setManifest] = useState(manifestCache);
  const [loading, setLoading] = useState(!manifestCache);

  useEffect(() => {
    if (manifestCache) return;
    fetch('/data/manifest.json')
      .then((r) => r.json())
      .then((data) => {
        manifestCache = data;
        setManifest(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load manifest:', err);
        setLoading(false);
      });
  }, []);

  return { manifest, loading };
}
