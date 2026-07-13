import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { generateQrMatrix } from "../utils/qrCode";
import { colors } from "../theme";

type FriendQrCodeProps = {
  /** QRに載せる文字列（フレンドペイロード）。 */
  value: string;
  /** 描画サイズ（px, 正方形）。 */
  size?: number;
  /** 黒モジュール色。 */
  color?: string;
  /** 背景色。 */
  background?: string;
  /** 周囲のクワイエットゾーン（モジュール数）。 */
  quietZone?: number;
};

/** 暗モジュールを1本のPath（d属性）にまとめて描画負荷を抑える。 */
const buildPath = (modules: boolean[][]): string => {
  const parts: string[] = [];
  for (let y = 0; y < modules.length; y += 1) {
    const row = modules[y]!;
    for (let x = 0; x < row.length; x += 1) {
      if (row[x]) {
        parts.push(`M${x} ${y}h1v1h-1z`);
      }
    }
  }
  return parts.join("");
};

export const FriendQrCode = ({
  value,
  size = 220,
  color = colors.ink,
  background = "#FFFFFF",
  quietZone = 4
}: FriendQrCodeProps) => {
  const result = useMemo(() => {
    try {
      const matrix = generateQrMatrix(value, "M");
      return { matrix, path: buildPath(matrix.modules) };
    } catch {
      return null;
    }
  }, [value]);

  if (!result) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Text style={styles.fallbackText}>QRを生成できませんでした</Text>
      </View>
    );
  }

  const total = result.matrix.size + quietZone * 2;

  return (
    <View style={[styles.wrapper, { backgroundColor: background, padding: 0 }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
        <Rect x={0} y={0} width={total} height={total} fill={background} />
        <Path d={result.path} fill={color} transform={`translate(${quietZone}, ${quietZone})`} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: "hidden"
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.borderFaint,
    borderWidth: 1,
    borderColor: colors.border
  },
  fallbackText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  }
});
