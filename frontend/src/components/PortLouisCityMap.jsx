import RegionSubMap from "@/components/RegionSubMap";
import {
  BookOpen, Utensils, Landmark, Church, Castle, Trophy, ChefHat,
} from "lucide-react";

const PORT_LOUIS_MAP = "/port_louis_map.png";

const TOUR_ICON = {
  "t-pl-aapravasi-ghat": Landmark,
  "t-pl-blue-penny": BookOpen,
  "t-pl-central-market": Utensils,
  "t-pl-cathedral": Church,
  "t-pl-citadelle": Castle,
  "t-pl-champ-de-mars": Trophy,
  "t-creole-table": ChefHat,
};

export default function PortLouisCityMap(props) {
  return (
    <RegionSubMap
      {...props}
      mapImage={PORT_LOUIS_MAP}
      title="Port Louis"
      subtitle="Capital of An Deor"
      subregion="port-louis"
      hudScope="port-louis"
      tourIcons={TOUR_ICON}
      labelStrip={(n) => n.replace("Port Louis ", "").replace("(UNESCO)", "").trim()}
      testIdPrefix="port-louis"
    />
  );
}
