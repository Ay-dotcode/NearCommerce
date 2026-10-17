import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Returns a function that goes back one page. When this page is the first one the visitor
// opened (a bookmark, a refreshed tab, an email link) there is nothing to go back to, so it
// goes to `fallback` instead of leaving the app.
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate();
  // React Router marks the first entry of a session with the key "default".
  const hasPreviousPage = useLocation().key !== "default";
  return useCallback(() => {
    if (hasPreviousPage) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [hasPreviousPage, navigate, fallback]);
}
