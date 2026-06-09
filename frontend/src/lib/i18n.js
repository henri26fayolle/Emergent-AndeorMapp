/**
 * Tiny in-app i18n dictionary for An Deor.
 *
 * Languages: 'en' (English), 'fr' (Français), 'mfe' (Kreol Morisien).
 *
 * Scope today: the Prologue/onboarding flow + the language picker itself.
 * The rest of the game UI stays in English for now. Ti Dodo's AI replies
 * are localised server-side via the user's saved `language` preference.
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en",  name: "English",         flag: "🇬🇧", short: "EN" },
  { code: "fr",  name: "Français",        flag: "🇫🇷", short: "FR" },
  { code: "mfe", name: "Kreol Morisien",  flag: "🇲🇺", short: "MU" },
];

const STRINGS = {
  // ===== Language picker =====
  "picker.title": {
    en:  "Choose your language",
    fr:  "Choisis ta langue",
    mfe: "Swazir ou lang",
  },
  "picker.hint": {
    en:  "You can change this any time from your profile.",
    fr:  "Tu pourras la changer à tout moment depuis ton profil.",
    mfe: "Ou kapav sanze lor ou profil tou letan.",
  },

  // ===== Top bar =====
  "topbar.brand": { en: "An Deor · Quest", fr: "An Deor · Quest", mfe: "An Deor · Kest" },
  "topbar.signin": {
    en:  "I already have an account →",
    fr:  "J'ai déjà un compte →",
    mfe: "Mo deza enan enn kont →",
  },

  // ===== Ti Dodo dialog lines (the 6-line cinematic) =====
  "dialog.0": {
    en:  "Eh, bonzour, traveler... mo finn pe atann ou. (I've been waiting for you.)",
    fr:  "Eh, bonzour, voyageur... mo finn pe atann ou. (Je t'attendais.)",
    mfe: "Eh, bonzour, vwayazer... mo finn pe atann ou.",
  },
  "dialog.1": {
    en:  "Welcome to Mauritius — not the postcard. The real one. Lagoons, ridges, sega rhythm, Creole spice.",
    fr:  "Bienvenue à Maurice — pas celle des cartes postales. La vraie. Lagons, crêtes, rythme du séga, épices créoles.",
    mfe: "Bienvini Moris — pa Moris kart-postal. Vre Moris. Lagon, montagn, rythm sega, gou kreol.",
  },
  "dialog.2": {
    en:  "An Deor has charted this island into five regions. Each one is locked... until you earn the right to step in.",
    fr:  "An Deor a cartographié l'île en cinq régions. Chacune est verrouillée... jusqu'à ce que tu mérites d'y entrer.",
    mfe: "An Deor finn divize lil-la dan 5 rézyon. Sak rézyon vereye... ziska ou gagn drwa pou rant ladan.",
  },
  "dialog.3": {
    en:  "Book a tour with one of our guides — or walk a free trail with me whispering the stories straight in your ear.",
    fr:  "Réserve un tour avec l'un de nos guides — ou marche sur un sentier libre, je te raconterai les histoires à l'oreille.",
    mfe: "Rezerv enn tour avek enn nou gid — ouswa mars lor enn sentye lib, mo va sousout zistwar dan ou zorey.",
  },
  "dialog.4": {
    en:  "Every step earns cards, titles and real-world rewards: tour discounts, partner goodies, shareable trail postcards.",
    fr:  "Chaque pas rapporte des cartes, des titres et de vraies récompenses : réductions, cadeaux partenaires, cartes postales à partager.",
    mfe: "Sak pa fer gagn kart, tit, ek vrai rekonpens : rabe, kado partner, kart postal pou partaze.",
  },
  "dialog.5": {
    en:  "But first, mo bizin koné ou nom. (I need to know your name.)",
    fr:  "Mais d'abord, mo bizin koné ou nom. (Je dois connaître ton prénom.)",
    mfe: "Me avan tou, mo bizin koné ou nom.",
  },

  // ===== Dialog footer =====
  "dialog.footer.skip":  { en: "Skip",  fr: "Passer", mfe: "Sote" },
  "dialog.footer.press": { en: "Press", fr: "Appuie sur", mfe: "Press" },

  // ===== Name step =====
  "step1.label":     { en: "Step 1 of 3",         fr: "Étape 1 sur 3",        mfe: "Letap 1 lor 3" },
  "name.heading":    { en: "What shall I call you?", fr: "Comment vais-je t'appeler ?", mfe: "Ki nom mo pou apel ou ?" },
  "name.subhead":    { en: "This is how guides will greet you on tour.", fr: "C'est ainsi que les guides te salueront en tour.", mfe: "Sa nom-la ki gid pou servi pou di ou bonzour." },
  "name.label":      { en: "Explorer name",       fr: "Nom d'explorateur",    mfe: "Nom eksploratter" },
  "name.placeholder":{ en: "e.g. Ravi, Léa, Sanjay…", fr: "ex. Ravi, Léa, Sanjay…", mfe: "egz. Ravi, Léa, Sanjay…" },

  // ===== Avatar step =====
  "step2.label":     { en: "Step 2 of 3",                fr: "Étape 2 sur 3", mfe: "Letap 2 lor 3" },
  "avatar.heading":  { en: "Choose your starter explorer", fr: "Choisis ton explorateur de départ", mfe: "Swazir ou premie eksploratter" },
  "avatar.subhead":  { en: "Don't stress — you can always swap later.", fr: "Pas de stress — tu peux changer plus tard.", mfe: "Pa stres — ou kapav sanze plitar." },
  "avatar.selected": { en: "Selected", fr: "Sélectionné", mfe: "Swazir" },

  // ===== Register step =====
  "step3.label":     { en: "Step 3 of 3",  fr: "Étape 3 sur 3", mfe: "Letap 3 lor 3" },
  "register.heading":{ en: "Connect your Andeor account", fr: "Connecte ton compte Andeor", mfe: "Konekte ou kont Andeor" },
  "register.subhead":{ en: "Save your quest and use the same account for bookings, {name}.", fr: "Sauvegarde ta quête et utilise le même compte pour tes réservations, {name}.", mfe: "Sov ou kest ek servi mem kont-la pou rezervasion, {name}." },
  "register.google": { en: "Continue with Google", fr: "Continuer avec Google", mfe: "Kontinye avek Google" },
  "register.google.subhead": { en: "Use the Google account connected to Andeor.", fr: "Utilise le compte Google connecté à Andeor.", mfe: "Servi kont Google ki konekte ar Andeor." },
  "register.signup": { en: "Sign up", fr: "Créer un compte", mfe: "Kre enn kont" },
  "register.signup.subhead": { en: "Create a new Andeor account.", fr: "Crée un nouveau compte Andeor.", mfe: "Kre enn nouvo kont Andeor." },
  "register.login": { en: "Log in", fr: "Se connecter", mfe: "Konekte" },
  "register.login.subhead": { en: "Already have an Andeor account.", fr: "Tu as déjà un compte Andeor.", mfe: "Ou deza enan enn kont Andeor." },
  "register.email":  { en: "Email",    fr: "Email",      mfe: "Email" },
  "register.password":{ en: "Password", fr: "Mot de passe", mfe: "Mo-pas" },
  "register.submit": { en: "Begin the quest", fr: "Commencer la quête", mfe: "Komans kest-la" },
  "register.submit.busy":{ en: "Embarking…", fr: "Embarquement…", mfe: "Pe anbark…" },

  // ===== Tutorial =====
  "tutorial.header": { en: "How to play · {n} / {total}", fr: "Comment jouer · {n} / {total}", mfe: "Kouma zwe · {n} / {total}" },
  "tutorial.0.title": { en: "Travel the island",       fr: "Parcours l'île",          mfe: "Vwayaz dan lil" },
  "tutorial.0.body":  {
    en:  "Five regions to unlock. Book real outdoor & cultural tours from An Deor's marketplace — each one ties to a Mauritian region and a real local guide.",
    fr:  "Cinq régions à déverrouiller. Réserve de vrais tours nature et culture sur la marketplace An Deor — chacun lié à une région et un guide local.",
    mfe: "Sin rézyon pou dewere. Rezerv vrai tour natir ek kiltir lor marketplas An Deor — sakenn lye ar enn rézyon ek enn gid lokal.",
  },
  "tutorial.1.title": { en: "Or walk a free trail",     fr: "Ou marche un sentier libre", mfe: "Ouswa mars enn sentye lib" },
  "tutorial.1.body":  {
    en:  "Tap a free pin on any region map. Your phone's GPS guides you stop-to-stop while Ti Dodo narrates the lore live (and you earn a shareable postcard at the end).",
    fr:  "Touche une épingle libre sur la carte d'une région. Le GPS te guide d'arrêt en arrêt pendant que Ti Dodo raconte (et tu gagnes une carte postale à partager à la fin).",
    mfe: "Tous enn ping lib lor enn kart rézyon. GPS-la gid ou stop-stop, Ti Dodo rakont zistwar live — ou gagn enn kart-postal pou partaze lafin.",
  },
  "tutorial.2.title": { en: "Quest & earn",             fr: "Quête & gagne",          mfe: "Kest ek gagn" },
  "tutorial.2.body":  {
    en:  "Every tour and every trail awards XP, region cards, badges — and the rarest of all: titles that carry your reputation across the island.",
    fr:  "Chaque tour et sentier rapporte de l'XP, des cartes de région, des badges — et le plus rare : des titres qui portent ta réputation à travers l'île.",
    mfe: "Sak tour ek sak sentye gagn XP, kart rézyon, badz — ek pli rar : tit ki port ou repitasion partou lor lil.",
  },
  "tutorial.3.title": { en: "Chase the Sagas",          fr: "Poursuis les Sagas",     mfe: "Swiv bann Saga" },
  "tutorial.3.body":  {
    en:  "Main Quests are multi-tour sagas. Complete one and you claim a unique title, a 50% bundle voucher, plus partner goodies if the saga is rich enough.",
    fr:  "Les Quêtes principales sont des sagas multi-tours. Termine-en une et tu obtiens un titre unique, un bon de réduction 50%, plus des cadeaux partenaires.",
    mfe: "Bann Kest Prinsipal se saga ki konport plizier tour. Fini enn ek gagn enn tit inik, enn bon 50%, ek kado partner si saga-la enportan.",
  },
  "tutorial.4.title": { en: "Climb the leaderboard",    fr: "Grimpe au classement",   mfe: "Mont dan klasman" },
  "tutorial.4.body":  {
    en:  "Become the Top Explorer of Mauritius. Mo le wer toi la-haut! (I want to see you up there!)",
    fr:  "Deviens le Meilleur Explorateur de Maurice. Mo le wer toi la-haut !",
    mfe: "Vinn Premie Eksploratter Moris. Mo le wer ou la-haut !",
  },

  // ===== Buttons =====
  "btn.continue":  { en: "Continue", fr: "Continuer", mfe: "Kontinye" },
  "btn.back":      { en: "Back",     fr: "Retour",    mfe: "Retour" },
  "btn.next":      { en: "Next",     fr: "Suivant",   mfe: "Apre" },
  "btn.enterWorld":{ en: "Enter Mauritius", fr: "Entrer dans Maurice", mfe: "Rant dan Moris" },
};

/**
 * Translate a key. Falls back to the English string then to the key itself.
 * Supports trivial `{name}` placeholders.
 */
export function translate(key, lang, vars) {
  const entry = STRINGS[key];
  if (!entry) return key;
  let out = entry[lang] || entry.en || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}
