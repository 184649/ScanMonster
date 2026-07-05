import { Alert } from "react-native";

export const showComingSoon = (
  message = "この機能は今後のアップデートで追加予定です。"
): void => {
  Alert.alert("近日公開", message, [{ text: "OK" }]);
};
