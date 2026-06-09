import { motion } from "framer-motion";
import { Clock, Compass, ExternalLink } from "lucide-react";

/**
 * Parchment-styled "quest scroll" card for tours.
 * Replaces generic product-card. Used in RegionScene and Tours page.
 */
export default function QuestScroll({ tour, regionName, onBegin, disabled = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotate: -0.4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      whileHover={{ y: -4, rotate: 0.3 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative"
      data-testid={`scroll-${tour.tour_id}`}
    >
      {/* Wax seal — XP reward */}
      <div className="absolute -top-3 -right-3 z-10 w-16 h-16 rounded-full bg-sunset-500 text-white flex items-center justify-center shadow-lift border-4 border-sand-100 rotate-[8deg]">
        <div className="text-center leading-none">
          <div className="font-display text-xl">+{tour.xp_reward}</div>
          <div className="text-[8px] tracking-[0.25em] uppercase mt-0.5">XP</div>
        </div>
      </div>

      {/* Scroll body */}
      <div
        className="relative bg-[#FBF4E2] border-2 border-[#7A5A2B]/40 rounded-2xl overflow-hidden shadow-lift"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 22%, rgba(122,90,43,0.10) 0, transparent 35%)," +
            "radial-gradient(circle at 88% 80%, rgba(122,90,43,0.08) 0, transparent 40%)",
        }}
      >
        {/* Top torn-paper edge */}
        <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-3 text-[#7A5A2B]/30">
          <path d="M0,4 L0,2 L4,1 L8,3 L12,1 L16,2 L20,1 L24,3 L28,1 L32,2 L36,1 L40,3 L44,1 L48,2 L52,1 L56,3 L60,1 L64,2 L68,1 L72,3 L76,1 L80,2 L84,1 L88,3 L92,1 L96,2 L100,1 L100,4 Z" fill="currentColor" />
        </svg>

        {/* Hero image with sepia tint */}
        <div className="relative h-44 overflow-hidden">
          <img src={tour.image} alt={tour.name} className="w-full h-full object-cover" style={{ filter: "sepia(0.25) saturate(1.1) contrast(1.05)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3B2A0F]/80 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase ${tour.category === "outdoor" ? "bg-jungle-500 text-sand-100" : "bg-sunset-500 text-white"}`}>
              {tour.category}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase bg-sand-100/95 text-ink-900 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {tour.duration}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 relative">
          {regionName && (
            <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#7A5A2B] mb-2">~ {regionName} ~</div>
          )}
          <h3 className="font-display text-xl text-ink-900 mb-2 italic" style={{ fontStyle: "italic" }}>
            {tour.name}
          </h3>
          <p className="text-sm text-ink-700 leading-relaxed mb-4 line-clamp-2">{tour.description}</p>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-jungle-700">€{tour.price}</span>
              <span className="text-xs text-ink-700">/ adventurer</span>
            </div>
            <div className="flex items-center gap-2">
              {tour.marketplace_url && (
                <a
                  href={tour.marketplace_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on Andeor marketplace"
                  className="inline-flex items-center gap-1 rounded-full border border-[#7A5A2B]/40 bg-sand-100 hover:bg-[#f5ead0] text-[#7A5A2B] px-3 py-2 text-xs font-bold tracking-wide transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Book
                </a>
              )}
              <button
                onClick={() => onBegin && onBegin(tour)}
                disabled={disabled}
                data-testid={`scroll-begin-${tour.tour_id}`}
                className="group inline-flex items-center gap-2 rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100 px-5 py-2.5 font-display tracking-wide text-sm shadow-clay disabled:opacity-50 transition-all"
              >
                <Compass className="w-4 h-4" />
                Begin quest
              </button>
            </div>
          </div>
        </div>

        {/* Bottom torn edge */}
        <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-3 text-[#7A5A2B]/30 rotate-180">
          <path d="M0,4 L0,2 L4,1 L8,3 L12,1 L16,2 L20,1 L24,3 L28,1 L32,2 L36,1 L40,3 L44,1 L48,2 L52,1 L56,3 L60,1 L64,2 L68,1 L72,3 L76,1 L80,2 L84,1 L88,3 L92,1 L96,2 L100,1 L100,4 Z" fill="currentColor" />
        </svg>
      </div>
    </motion.div>
  );
}
