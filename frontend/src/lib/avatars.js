import { Waves, Mountain, Soup, Music2, Wind, BookOpen } from "lucide-react";

// The 5 guides of An Deor — each playable as your in-game character.
// `image` is a self-hosted JPG portrait, `icon` is the fallback when the image hasn't loaded.
export const AVATARS = [
  {
    id: "naima",
    name: "Naïma",
    role: "Sega Dancer · North Coast",
    bio: "Lives by the ravanne drum and the lagoon foam.",
    image: "/avatars/naima.jpg",
    icon: Music2,
    tone: "sunset",
    gradient: "from-sunset-500 to-sun-500",
    region: "north-coast",
  },
  {
    id: "akil",
    name: "Akil",
    role: "Mountain Guide · Black River",
    bio: "Knows every shortcut to a sunrise on Le Pouce.",
    image: "/avatars/akil.jpg",
    icon: Mountain,
    tone: "jungle",
    gradient: "from-jungle-500 to-jungle-700",
    region: "black-river",
  },
  {
    id: "lea",
    name: "Léa",
    role: "Kite Surf Captain · Le Morne",
    bio: "Reads the trade winds like a book.",
    image: "/avatars/lea.jpg",
    icon: Wind,
    tone: "ocean",
    gradient: "from-ocean-400 to-ocean-700",
    region: "south-wild",
  },
  {
    id: "sanjay",
    name: "Sanjay",
    role: "Reef Ecologist · East Lagoons",
    bio: "Speaks fluent parrotfish.",
    image: "/avatars/sanjay.jpg",
    icon: Waves,
    tone: "ocean",
    gradient: "from-ocean-500 to-jungle-500",
    region: "east-lagoons",
  },
  {
    id: "marie",
    name: "Marie",
    role: "Creole Table Host · Port Louis",
    bio: "Cooks rougaille like her grandmother taught.",
    image: "/avatars/marie.jpg",
    icon: Soup,
    tone: "sunset",
    gradient: "from-sunset-500 to-sunset-700",
    region: "central-culture",
  },
];

// Legacy avatar IDs (kept so existing accounts gracefully migrate to the named guides).
const LEGACY_MAP = {
  diver:   "sanjay",
  hiker:   "akil",
  foodie:  "marie",
  dancer:  "naima",
  surfer:  "lea",
  scholar: "marie",
};

export const findAvatar = (id) => {
  if (!id) return null;
  const mapped = LEGACY_MAP[id] || id;
  return AVATARS.find((a) => a.id === mapped) || null;
};
