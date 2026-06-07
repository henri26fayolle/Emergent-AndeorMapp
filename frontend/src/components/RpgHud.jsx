import { useAuth } from "@/contexts/AuthContext";
import AvatarHud from "@/components/AvatarHud";
import EpilogueWatcher from "@/components/EpilogueWatcher";
import TrailEpilogueWatcher from "@/components/TrailEpilogueWatcher";
import SelfGuidedHud from "@/components/SelfGuidedHud";

/**
 * Global game chrome — minimal, single-entry. The bottom-left avatar is the
 * only navigation surface; clicking it opens the Character Sheet (Main Quest,
 * Bag, Side Quests, Rewards, Leaderboard, Ti Dodo) which carries all of the
 * tools that used to live in the right-rail (mute, sign out, admin, etc).
 */
export default function RpgHud() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <AvatarHud />
      <EpilogueWatcher />
      <TrailEpilogueWatcher />
      <SelfGuidedHud />
    </>
  );
}
