import { useState, useEffect, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  "idle" | "checking" | "available" | "downloading" | "ready" | "error" | "none";

export interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const update = await check();
      if (update) {
        setInfo({
          version: update.version,
          date: update.date ?? "",
          body: update.body ?? "",
        });
        setStatus("available");
      } else {
        setStatus("none");
      }
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!info) return;
    setStatus("downloading");
    setDownloaded(0);
    setContentLength(0);

    try {
      const update = await check();
      if (!update) {
        setStatus("none");
        return;
      }

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            setContentLength(event.data.contentLength ?? 0);
            break;
          case "Progress":
            setDownloaded((prev) => prev + event.data.chunkLength);
            break;
          case "Finished":
            break;
        }
      });

      setStatus("ready");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }, [info]);

  const restart = useCallback(async () => {
    await relaunch();
  }, []);

  const dismiss = useCallback(() => {
    setStatus("none");
    setInfo(null);
    setError(null);
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return {
    status,
    info,
    downloaded,
    contentLength,
    error,
    checkForUpdate,
    downloadAndInstall,
    restart,
    dismiss,
  };
}
