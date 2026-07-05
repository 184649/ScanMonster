import type { ImageSourcePropType } from "react-native";

/**
 * 個体詳細の背景画像。assets/backgrounds/<key>.png を静的に require する。
 * 存在するファイルのみ登録すること（存在しない画像を require するとビルドが壊れる）。
 */
export const backgroundImages: Record<string, ImageSourcePropType> = {
  // 通常・季節・レア背景（BACKGROUND_UNLOCKS のキー）
  default: require("../../assets/backgrounds/default.png"),
  forest: require("../../assets/backgrounds/forest.png"),
  water: require("../../assets/backgrounds/water.png"),
  wetland: require("../../assets/backgrounds/wetland.png"),
  sky: require("../../assets/backgrounds/sky.png"),
  grassland: require("../../assets/backgrounds/grassland.png"),
  underground: require("../../assets/backgrounds/underground.png"),
  camp: require("../../assets/backgrounds/camp.png"),
  autumn_leaves: require("../../assets/backgrounds/autumn_leaves.png"),
  snow_light: require("../../assets/backgrounds/snow_light.png"),
  rare: require("../../assets/backgrounds/rare.png"),
  legend: require("../../assets/backgrounds/legend.png"),
  // 個体タイプ由来の背景（存在する分）
  morning_dew: require("../../assets/backgrounds/morning_dew.png"),
  sunlight: require("../../assets/backgrounds/sunlight.png"),
  twilight: require("../../assets/backgrounds/twilight.png"),
  moon_shadow: require("../../assets/backgrounds/moon_shadow.png"),
  spring_breeze: require("../../assets/backgrounds/spring_breeze.png"),
  summer_light: require("../../assets/backgrounds/summer_light.png")
};

export const getBackgroundImageSource = (key?: string): ImageSourcePropType | undefined => {
  if (!key) {
    return undefined;
  }
  return backgroundImages[key];
};

export const hasBackgroundImage = (key?: string): boolean => Boolean(key && backgroundImages[key]);
