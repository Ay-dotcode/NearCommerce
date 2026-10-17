import Toast from "react-native-toast-message";

// One place for every pop-up message, so they all look and behave the same. They appear near
// the bottom of the screen, above the tab bar, where a thumb can reach and dismiss them.
export const notify = {
  success: (title: string, message?: string) =>
    Toast.show({ type: "success", text1: title, text2: message }),
  info: (title: string, message?: string) =>
    Toast.show({ type: "info", text1: title, text2: message }),
  error: (title: string, message?: string) =>
    Toast.show({ type: "error", text1: title, text2: message }),
};
