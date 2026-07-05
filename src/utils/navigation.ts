export type SafeNavigation = {
  canGoBack?: () => boolean;
  goBack?: () => void;
  navigate: (name: string, params?: unknown) => void;
};

export const goBackOrHome = (navigation: SafeNavigation): void => {
  if (navigation.canGoBack?.()) {
    navigation.goBack?.();
    return;
  }

  navigation.navigate("MainTabs", { screen: "Home" });
};
