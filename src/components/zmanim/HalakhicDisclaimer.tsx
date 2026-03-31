import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HalakhicDisclaimer = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="mx-1 mb-3 rounded-xl border border-amber-300/40 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-700/40 px-3.5 py-2.5"
      >
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none mt-0.5">🪧</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 leading-snug mb-1">
              Avertissement important
            </p>
            <p className="text-[10px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Les horaires de Zmanim, Chabbat et fêtes sont donnés <strong>à titre indicatif</strong>, sans engagement halakhique. 
              En cas de doute ou d'erreur, la responsabilité de l'allumage des bougies incombe à l'utilisateur. 
              Consultez votre Rav pour toute question.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors text-xs"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HalakhicDisclaimer;
