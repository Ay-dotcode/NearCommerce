import {
  canInstallInApp,
  downloadApk,
  installApk,
  isApkUrl,
  type ApkDownload,
} from "@/helpers/appInstall";
import { openUpdatePage } from "@/helpers/appUpdate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type InstallPhase =
  | "idle"
  | "downloading"
  | "installing"
  | "returned"
  | "failed";

export type InstallFailure = "download" | "install" | "link";

export function useUpdateInstaller(url: string, version: string) {
  const mode = useMemo<"install" | "link">(
    () => (isApkUrl(url) && canInstallInApp() ? "install" : "link"),
    [url],
  );
  const [phase, setPhase] = useState<InstallPhase>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<InstallFailure | null>(null);

  const download = useRef<ApkDownload | null>(null);
  const file = useRef<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      download.current?.cancel();
    };
  }, []);

  const fail = (reason: InstallFailure) => {
    if (!mounted.current) return;
    setFailure(reason);
    setPhase("failed");
  };

  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailure(null);
    try {
      if (mode === "link") {
        if (!(await openUpdatePage(url))) fail("link");
        return;
      }

      if (!file.current) {
        setProgress(0);
        setPhase("downloading");
        const current = downloadApk(url, version, (fraction) => {
          if (mounted.current) setProgress(fraction);
        });
        download.current = current;
        try {
          file.current = await current.promise;
        } catch {
          // Cancelled by the shopper: back to the start, not an error.
          if (download.current !== current) return;
          download.current = null;
          fail("download");
          return;
        }
        download.current = null;
      }

      if (!mounted.current) return;
      setPhase("installing");
      try {
        await installApk(file.current);
      } catch {
        fail("install");
        return;
      }
      // Still here: the install didn't go ahead (cancelled, or Android asked to allow installs).
      if (mounted.current) setPhase("returned");
    } finally {
      busy.current = false;
    }
  }, [mode, url, version]);

  // Stops a download in progress and goes back to the start.
  const cancel = useCallback(() => {
    const current = download.current;
    download.current = null;
    current?.cancel();
    if (mounted.current && current) {
      setPhase("idle");
      setProgress(null);
    }
  }, []);

  // The last resort when installing inside the app doesn't work.
  const openInBrowser = useCallback(() => {
    void openUpdatePage(url);
  }, [url]);

  return { mode, phase, progress, failure, start, cancel, openInBrowser };
}
