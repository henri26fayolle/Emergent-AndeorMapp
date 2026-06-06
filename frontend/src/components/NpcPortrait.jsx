// Chibi SVG portraits for each NPC guide. Pure SVG, no external images.
// Each component renders inside its parent container (use the wrapper's size).

const Frame = ({ children, bg }) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <radialGradient id="bg-grad" cx="50%" cy="40%" r="70%">
        <stop offset="0" stopColor="white" stopOpacity="0.25" />
        <stop offset="1" stopColor={bg} stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="120" height="120" rx="20" fill={bg} />
    <rect x="0" y="0" width="120" height="120" rx="20" fill="url(#bg-grad)" />
    {children}
    {/* Inner frame */}
    <rect x="3" y="3" width="114" height="114" rx="18" fill="none" stroke="#102E25" strokeOpacity="0.5" strokeWidth="1.5" />
  </svg>
);

const Head = ({ skin = "#D4A373" }) => (
  <>
    {/* Neck */}
    <rect x="52" y="80" width="16" height="12" fill={skin} />
    {/* Head */}
    <ellipse cx="60" cy="62" rx="22" ry="22" fill={skin} />
    {/* Cheek blush */}
    <circle cx="48" cy="70" r="3" fill="#E08066" opacity="0.5" />
    <circle cx="72" cy="70" r="3" fill="#E08066" opacity="0.5" />
    {/* Mouth */}
    <path d="M55 73 Q60 77 65 73" fill="none" stroke="#3B2418" strokeWidth="1.5" strokeLinecap="round" />
  </>
);

const Eyes = ({ closed = false }) =>
  closed ? (
    <>
      <path d="M48 64 Q52 66 56 64" stroke="#3B2418" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M64 64 Q68 66 72 64" stroke="#3B2418" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ) : (
    <>
      <circle cx="52" cy="64" r="2.2" fill="#3B2418" />
      <circle cx="68" cy="64" r="2.2" fill="#3B2418" />
      <circle cx="52.7" cy="63.3" r="0.7" fill="white" />
      <circle cx="68.7" cy="63.3" r="0.7" fill="white" />
    </>
  );

// Naïma — Sea Guide. Snorkel mask + braided hair, ocean bg.
const Naima = () => (
  <Frame bg="#006C7A">
    <Head skin="#A86E47" />
    {/* Hair (long braid) */}
    <path d="M38 56 Q40 42 60 38 Q80 42 82 56 Q82 64 80 66 Q78 50 60 46 Q42 50 40 66 Q38 64 38 56 Z" fill="#1A1410" />
    {/* Braid */}
    <path d="M40 66 Q36 80 38 96" stroke="#1A1410" strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* Snorkel mask band */}
    <rect x="36" y="58" width="48" height="6" fill="#102E25" />
    {/* Mask glass */}
    <rect x="38" y="58.5" width="20" height="9" rx="3" fill="#BFE4E8" />
    <rect x="62" y="58.5" width="20" height="9" rx="3" fill="#BFE4E8" />
    {/* Snorkel tube */}
    <rect x="80" y="56" width="4" height="22" rx="2" fill="#D46F4D" />
    {/* Body (wetsuit) */}
    <path d="M30 110 Q60 78 90 110 L90 120 L30 120 Z" fill="#004B56" />
    <path d="M52 92 L60 100 L68 92" stroke="#BFE4E8" strokeWidth="2" fill="none" />
  </Frame>
);

// Akil — Trail Master. Wide-brim hiking hat, backpack, jungle bg.
const Akil = () => (
  <Frame bg="#265448">
    {/* Body */}
    <path d="M30 110 Q60 80 90 110 L90 120 L30 120 Z" fill="#7A5A2B" />
    {/* Backpack strap */}
    <rect x="40" y="84" width="6" height="26" fill="#3A2317" />
    <rect x="74" y="84" width="6" height="26" fill="#3A2317" />
    <Head skin="#C89373" />
    {/* Hair */}
    <path d="M40 56 Q60 38 80 56 Q80 50 60 42 Q40 48 40 56 Z" fill="#3A2317" />
    <Eyes />
    {/* Hiking hat */}
    <ellipse cx="60" cy="48" rx="32" ry="6" fill="#3A2317" />
    <path d="M44 48 Q44 32 60 30 Q76 32 76 48 Z" fill="#5C4327" />
    <rect x="44" y="46" width="32" height="3" fill="#D46F4D" />
    {/* Beard hint */}
    <path d="M50 74 Q60 80 70 74" stroke="#3A2317" strokeWidth="1.5" fill="none" />
  </Frame>
);

// Léa — Wind Whisperer. Flowing hair, sunglasses, sky bg.
const Lea = () => (
  <Frame bg="#E08066">
    {/* Body (rashguard) */}
    <path d="M30 110 Q60 78 90 110 L90 120 L30 120 Z" fill="#FBF4E2" />
    <Head skin="#E5B58A" />
    {/* Long flowing hair behind */}
    <path d="M28 96 Q26 70 36 50 Q40 38 60 36 Q80 38 84 50 Q94 70 92 96 L82 96 Q84 78 78 62 Q70 50 60 50 Q50 50 42 62 Q36 78 38 96 Z" fill="#F5B642" />
    {/* Front hair tuft */}
    <path d="M44 50 Q60 38 76 50 Q70 44 60 44 Q50 44 44 50 Z" fill="#E8B241" />
    {/* Sunglasses */}
    <rect x="44" y="60" width="13" height="8" rx="3" fill="#102E25" />
    <rect x="63" y="60" width="13" height="8" rx="3" fill="#102E25" />
    <rect x="56.5" y="63" width="7" height="2" fill="#102E25" />
    {/* Smile */}
    <path d="M54 74 Q60 80 66 74" stroke="#3B2418" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </Frame>
);

// Sanjay — Reef Keeper. Diving mask + curly hair, teal bg.
const Sanjay = () => (
  <Frame bg="#004B56">
    <Head skin="#9B6A45" />
    {/* Curly hair */}
    <g fill="#1A1410">
      <circle cx="44" cy="46" r="6" />
      <circle cx="52" cy="42" r="7" />
      <circle cx="60" cy="40" r="7.5" />
      <circle cx="68" cy="42" r="7" />
      <circle cx="76" cy="46" r="6" />
    </g>
    {/* Diving mask big oval */}
    <ellipse cx="60" cy="64" rx="22" ry="10" fill="#102E25" />
    <ellipse cx="60" cy="64" rx="19" ry="7.5" fill="#BFE4E8" opacity="0.85" />
    {/* Mask highlight */}
    <ellipse cx="52" cy="62" rx="6" ry="2" fill="white" opacity="0.55" />
    {/* Moustache */}
    <path d="M52 74 Q60 78 68 74" stroke="#1A1410" strokeWidth="2" fill="none" />
    {/* Body — wetsuit */}
    <path d="M30 110 Q60 78 90 110 L90 120 L30 120 Z" fill="#006C7A" />
    {/* Fin slung over shoulder */}
    <path d="M82 96 Q92 92 90 80 Q86 84 80 86 Z" fill="#D46F4D" />
  </Frame>
);

// Marie — Heritage Keeper. Turban + earrings, terracotta bg.
const Marie = () => (
  <Frame bg="#C05E3E">
    {/* Body (sega blouse) */}
    <path d="M30 110 Q60 78 90 110 L90 120 L30 120 Z" fill="#F0C25C" />
    {/* Pattern dots on blouse */}
    <g fill="#C05E3E" opacity="0.7">
      <circle cx="44" cy="106" r="1.8" />
      <circle cx="60" cy="108" r="1.8" />
      <circle cx="76" cy="106" r="1.8" />
    </g>
    <Head skin="#8B5A3C" />
    {/* Turban */}
    <path d="M38 52 Q40 30 60 28 Q80 30 82 52 Q72 50 60 48 Q48 50 38 52 Z" fill="#D46F4D" />
    <path d="M40 48 Q60 32 80 48" stroke="#FBF4E2" strokeWidth="2" fill="none" />
    <path d="M40 52 Q60 38 80 52" stroke="#FBF4E2" strokeWidth="2" fill="none" />
    {/* Bun knot */}
    <circle cx="80" cy="46" r="6" fill="#D46F4D" />
    <Eyes />
    {/* Smile */}
    <path d="M54 74 Q60 80 66 74" stroke="#3B2418" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    {/* Earring */}
    <circle cx="38" cy="68" r="2" fill="#F0C25C" />
    <circle cx="82" cy="68" r="2" fill="#F0C25C" />
  </Frame>
);

const NPC_MAP = {
  naima: Naima,
  akil: Akil,
  lea: Lea,
  sanjay: Sanjay,
  marie: Marie,
};

export default function NpcPortrait({ id, className = "" }) {
  const C = NPC_MAP[id];
  if (!C) return null;
  return (
    <div className={className}>
      <C />
    </div>
  );
}
