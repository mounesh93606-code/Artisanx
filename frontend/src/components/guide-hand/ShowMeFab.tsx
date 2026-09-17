import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGuidanceStore, ARTISAN_TOUR_WORKFLOW, BUYER_TOUR_WORKFLOW } from '../../stores/guidanceStore';
import { useAuthStore } from '../../stores/authStore';
import type { GuidanceWorkflow } from '../../types/guidance';

interface ShowMeFabProps {
  workflow?: GuidanceWorkflow;
}

export default function ShowMeFab({ workflow }: ShowMeFabProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const startWorkflow = useGuidanceStore((state) => state.startWorkflow);
  const isActive = useGuidanceStore((state) => state.isActive);
  const guidanceLevel = useGuidanceStore((state) => state.guidanceLevel);

  if (isActive || guidanceLevel === 'off') return null;

  const targetWorkflow = workflow || (user?.role === 'buyer' ? BUYER_TOUR_WORKFLOW : ARTISAN_TOUR_WORKFLOW);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => startWorkflow(targetWorkflow)}
      className="fixed bottom-28 right-4 sm:right-6 z-[60] bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full px-4 py-2.5 shadow-[0_8px_25px_rgba(217,119,6,0.5)] flex items-center justify-center gap-2 hover:from-amber-600 hover:to-amber-700 active:scale-95 transition-all group border-2 border-white"
      aria-label="Helping Hand Guide"
      title="Helping Hand Guide"
    >
      <Sparkles className="w-5 h-5 text-white animate-pulse" />
      <span className="font-extrabold text-xs tracking-wide">
        {t('guide.show_me') || 'Helping Hand'}
      </span>
    </motion.button>
  );
}
