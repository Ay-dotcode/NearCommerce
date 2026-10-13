import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  // Red confirm button for actions that cannot be undone.
  destructive?: boolean;
}

export interface ChooseOptions {
  title: string;
  message?: string;
  options: { label: string; value: string }[];
  cancelLabel?: string;
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  choose: (options: ChooseOptions) => Promise<string | null>;
}

type Dialog =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | {
      kind: "choose";
      options: ChooseOptions;
      resolve: (v: string | null) => void;
    };

const DialogContext = createContext<DialogApi | null>(null);

// Replaces the phone's native alert boxes: confirmations and pick-one lists appear on the same
// blurred bottom sheet as every other pop-up. Call `await confirm(...)` or `await choose(...)`.
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // Keep showing the last dialog while the sheet animates out.
  const last = useRef<Dialog | null>(null);
  if (dialog) last.current = dialog;
  const shown = dialog ?? last.current;

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise((resolve) =>
          setDialog({ kind: "confirm", options, resolve }),
        ),
      choose: (options) =>
        new Promise((resolve) =>
          setDialog({ kind: "choose", options, resolve }),
        ),
    }),
    [],
  );

  const settle = useCallback(
    (value: boolean | string | null) => {
      if (!dialog) return;
      if (dialog.kind === "confirm") dialog.resolve(value === true);
      else dialog.resolve(typeof value === "string" ? value : null);
      setDialog(null);
    },
    [dialog],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <BottomSheet
        visible={dialog !== null}
        onClose={() => settle(null)}
        title={shown?.options.title ?? ""}
        description={shown?.options.message}
        testID="dialog-sheet"
      >
        {shown?.kind === "confirm" && (
          <View style={{ gap: 10 }}>
            <Button
              testID="dialog-confirm"
              title={shown.options.confirmLabel}
              variant={shown.options.destructive ? "danger" : "primary"}
              onPress={() => settle(true)}
            />
            <Button
              testID="dialog-cancel"
              title={shown.options.cancelLabel ?? "Cancel"}
              variant="secondary"
              onPress={() => settle(false)}
            />
          </View>
        )}
        {shown?.kind === "choose" && (
          <View style={{ gap: 10 }}>
            {shown.options.options.map((option) => (
              <Button
                key={option.value}
                title={option.label}
                variant="secondary"
                onPress={() => settle(option.value)}
              />
            ))}
            <Button
              testID="dialog-cancel"
              title={shown.options.cancelLabel ?? "Cancel"}
              variant="ghost"
              onPress={() => settle(null)}
            />
          </View>
        )}
      </BottomSheet>
    </DialogContext.Provider>
  );
}

export function useDialogs() {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialogs must be used inside DialogProvider");
  return value;
}
