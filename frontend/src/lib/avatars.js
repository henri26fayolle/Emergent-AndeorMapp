import { Waves, Mountain, Soup, Music2, Wind, BookOpen } from "lucide-react";

export const AVATARS = [
  { id: "diver",   name: "The Reef Diver",     bio: "At home below turquoise water.",     icon: Waves,    tone: "ocean",  gradient: "from-ocean-500 to-ocean-700" },
  { id: "hiker",   name: "The Ridge Hiker",    bio: "Trails over comfort.",               icon: Mountain, tone: "jungle", gradient: "from-jungle-500 to-jungle-700" },
  { id: "foodie",  name: "The Spice Hunter",   bio: "Lives for vindaye & gateau piment.", icon: Soup,     tone: "sunset", gradient: "from-sunset-500 to-sunset-600" },
  { id: "dancer",  name: "The Sega Dancer",    bio: "Rhythm is a love language.",         icon: Music2,   tone: "sun",    gradient: "from-sun-500 to-sunset-500" },
  { id: "surfer",  name: "The Wind Rider",     bio: "Kite, surf, repeat.",                icon: Wind,     tone: "ocean",  gradient: "from-ocean-500 to-jungle-500" },
  { id: "scholar", name: "The Heritage Scholar", bio: "Reads the island like a story.",   icon: BookOpen, tone: "jungle", gradient: "from-jungle-600 to-jungle-700" },
];

export const findAvatar = (id) => AVATARS.find((a) => a.id === id);
