import RegionSubMap from "@/components/RegionSubMap";
import { Mountain, Sailboat, Wind, Waves, Sparkles } from "lucide-react";

const LE_MORNE_MAP = "/le_morne_map.png";

const TOUR_ICON = {
  "t-kite-le-morne":     Wind,
  "t-chamarel-falls":    Sparkles,
  "t-lemorne-hike":      Mountain,
  "t-ile-aux-benitiers": Sailboat,
  "t-la-prairie-beach":  Waves,
};

export default function LeMorneMap(props) {
  return (
    <RegionSubMap
      {...props}
      mapImage={LE_MORNE_MAP}
      title="Le Morne"
      subtitle="UNESCO ridge · seven-coloured earth · trade winds"
      subregion="south-wild"
      hudScope="south-wild"
      tourIcons={TOUR_ICON}
      labelStrip={(n) => n.replace("Le Morne ", "").replace("(UNESCO)", "").trim()}
      testIdPrefix="le-morne"
    />
  );
}
