
import { useState, useEffect } from 'react';

const cache = {};

export function useDataset(name) {
  const [data, setData] = useState(cache[name]?.data || []);
  const [loading, setLoading] = useState(!cache[name]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!name) return;
    if (cache[name]) {
      setData(cache[name].data);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/data/${name}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${name}: ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        cache[name] = { data: rows };
        setData(rows);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [name]);

  return { data, loading, error };
}

export function useMultipleDatasets(names) {
  const [datasets, setDatasets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!names || names.length === 0) return;

    setLoading(true);
    Promise.all(
      names.map((name) => {
        if (cache[name]) return Promise.resolve({ name, data: cache[name].data });
        return fetch(`/data/${name}.json`)
          .then((r) => {
            if (!r.ok) throw new Error(`Failed to load ${name}: ${r.status}`);
            return r.json();
          })
          .then((rows) => {
            cache[name] = { data: rows };
            return { name, data: rows };
          });
      })
    )
      .then((results) => {
        const map = {};
        results.forEach(({ name, data }) => { map[name] = data; });
        setDatasets(map);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [names?.join(',')]);

  return { datasets, loading, error };
}
