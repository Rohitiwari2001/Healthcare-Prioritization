"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { PriorityConfigParams } from "@/lib/priority-engine/types";

export function useActiveConfig() {
  const [config, setConfig] = useState<{
    version: number;
    params: PriorityConfigParams;
    loading: boolean;
  }>({
    version: 1,
    params: DEFAULT_CONFIG_PARAMS,
    loading: true,
  });

  useEffect(() => {
    const metaRef = doc(db, "meta", "activeConfig");
    let unsubConfig: (() => void) | null = null;

    const unsubMeta = onSnapshot(
      metaRef,
      (metaSnap) => {
        if (!metaSnap.exists()) {
          setConfig({ version: 1, params: DEFAULT_CONFIG_PARAMS, loading: false });
          return;
        }

        const activeVer = metaSnap.data().version || 1;
        if (unsubConfig) unsubConfig();

        const configRef = doc(db, "configVersions", String(activeVer));
        unsubConfig = onSnapshot(
          configRef,
          (configSnap) => {
            if (configSnap.exists()) {
              const data = configSnap.data();
              setConfig({
                version: activeVer,
                params: data.params || DEFAULT_CONFIG_PARAMS,
                loading: false,
              });
            } else {
              setConfig({ version: activeVer, params: DEFAULT_CONFIG_PARAMS, loading: false });
            }
          },
          (err) => {
            console.error("Error listening to configVersion:", err);
            setConfig((prev) => ({ ...prev, loading: false }));
          }
        );
      },
      (err) => {
        console.error("Error listening to activeConfig:", err);
        setConfig((prev) => ({ ...prev, loading: false }));
      }
    );

    return () => {
      unsubMeta();
      if (unsubConfig) unsubConfig();
    };
  }, []);

  return config;
}
