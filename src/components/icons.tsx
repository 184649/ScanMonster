import { StyleSheet, Text, View } from "react-native";

export type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
};

type IconName =
  | "BK"
  | "CA"
  | "CK"
  | "CL"
  | "FI"
  | "GA"
  | "HA"
  | "HE"
  | "HI"
  | "HO"
  | "IN"
  | "LA"
  | "LO"
  | "MP"
  | "RC"
  | "SC"
  | "SA"
  | "SE"
  | "SH"
  | "SP"
  | "ST"
  | "SU"
  | "TR";

const makeIcon =
  (name: IconName) =>
  ({ color = "#1D4ED8", size = 22, fill }: IconProps) => {
    const fontSize = Math.max(9, Math.round(size * 0.36));
    const backgroundColor = fill && fill !== "transparent" ? fill : "transparent";

    return (
      <View
        style={[
          styles.icon,
          {
            width: size,
            height: size,
            borderColor: color,
            borderRadius: Math.max(4, Math.round(size * 0.22)),
            backgroundColor
          }
        ]}
      >
        <Text style={[styles.text, { color, fontSize }]}>{name}</Text>
      </View>
    );
  };

export const BookOpen = makeIcon("BK");
export const Camera = makeIcon("CA");
export const CheckCircle2 = makeIcon("CK");
export const Clock3 = makeIcon("CL");
export const Filter = makeIcon("FI");
export const GalleryVerticalEnd = makeIcon("GA");
export const Hash = makeIcon("HA");
export const Heart = makeIcon("HE");
export const History = makeIcon("HI");
export const Home = makeIcon("HO");
export const Info = makeIcon("IN");
export const Layers3 = makeIcon("LA");
export const LockKeyhole = makeIcon("LO");
export const Map = makeIcon("MP");
export const MapPin = makeIcon("MP");
export const RotateCcw = makeIcon("RC");
export const Save = makeIcon("SA");
export const Search = makeIcon("SE");
export const ShieldCheck = makeIcon("SH");
export const Sparkles = makeIcon("SP");
export const SunMedium = makeIcon("SU");
export const Trophy = makeIcon("TR");
export const ScanLine = makeIcon("SC");
export const Settings = makeIcon("ST");

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.8
  },
  text: {
    fontWeight: "900"
  }
});
