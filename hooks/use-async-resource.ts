"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

export function useAsyncResource<T>(loader: () => Promise<T>, key = "default") {
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const runLoader = useEffectEvent(loader);

  useEffect(() => {
    let active = true;
    runLoader()
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Something went wrong."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, revision]);

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }, []);
  return { data, setData, loading, error, reload };
}
