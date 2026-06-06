// Guide NPC portraits — uses the self-hosted JPGs in /public/avatars/.
const NPC_IMG = {
  naima:  "/avatars/naima.jpg",
  akil:   "/avatars/akil.jpg",
  lea:    "/avatars/lea.jpg",
  sanjay: "/avatars/sanjay.jpg",
  marie:  "/avatars/marie.jpg",
};

const NPC_BG = {
  naima:  "#0E4D5C", // ocean teal
  akil:   "#1B6F4B", // jungle green
  lea:    "#E27447", // sunset orange
  sanjay: "#0F8FA8", // bright ocean
  marie:  "#C05E3E", // terracotta
};

export default function NpcPortrait({ id, className = "" }) {
  const src = NPC_IMG[id];
  if (!src) return null;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ring-2 ring-sand-100 ${className}`}
      style={{ background: NPC_BG[id] || "#1B6F4B" }}
    >
      <img
        src={src}
        alt={`Guide portrait`}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Soft inset rim for that storybook feel */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ boxShadow: "inset 0 0 24px rgba(11,28,22,0.45)" }}
      />
    </div>
  );
}
