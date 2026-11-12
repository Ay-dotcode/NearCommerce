import {
  checkForUpdate,
  skipUpdate,
  type UpdateCheck,
} from "@/helpers/appUpdate";
import { useCallback, useEffect, useState } from "react";

type State = { status: "checking" } | UpdateCheck;

export function useAppUpdate() {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    let active = true;
    checkForUpdate()
      .then((result) => active && setState(result))
      .catch(() => active && setState({ status: "none" }));
    return () => {
      active = false;
    };
  }, []);

  const skip = useCallback(() => {
    if (state.status === "optional") void skipUpdate(state.latest);
    setState({ status: "none" });
  }, [state]);

  return { ...state, skip };
}
