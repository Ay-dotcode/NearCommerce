import { useColors } from "@/theme";
import Toast, {
  BaseToast,
  type BaseToastProps,
} from "react-native-toast-message";

// Toast host whose cards follow the light/dark theme (the library default is always white).
export default function ToastHost() {
  const c = useColors();
  const make = (accent: string) =>
    function ThemedToast(props: BaseToastProps) {
      return (
        <BaseToast
          {...props}
          style={{
            borderLeftColor: accent,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
          }}
          text1Style={{ color: c.text, fontSize: 15, fontWeight: "700" }}
          text2Style={{ color: c.textSecondary, fontSize: 13 }}
          text2NumberOfLines={3}
        />
      );
    };
  return (
    <Toast
      // Near the bottom, above the tab bar: easy to reach and it never covers the app bar.
      position="bottom"
      bottomOffset={96}
      config={{
        success: make(c.success),
        error: make(c.danger),
        info: make(c.primary),
      }}
    />
  );
}
