import RegionSubMap from "@/components/RegionSubMap";
import { assetPath } from "@/lib/assets";
import { Music, Waves, Church, Sailboat, Sun } from "lucide-react";

const NORTH_COAST_MAP = assetPath("/north_coast_map.png");

const TOUR_ICON = {
  "t-sega-night":           Music,
  "t-pereybere-snorkel":    Waves,
  "t-cap-malheureux":       Church,
  "t-grand-baie-cruise":    Sailboat,
  "t-trou-aux-biches":      Sun,
};

export default function NorthCoastMap(props) {
  return (
    <RegionSubMap
      {...props}
      mapImage={NORTH_COAST_MAP}
      title="North Coast"
      subtitle="Lagoons, drum nights & lighthouses"
      subregion="north-coast"
      hudScope="north-coast"
      tourIcons={TOUR_ICON}
      labelStrip={(n) => n.replace("North Coast ", "").trim()}
      testIdPrefix="north-coast"
    />
  );
}
