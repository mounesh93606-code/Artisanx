import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface InstructionCardProps {
  text: string;
  stepNumber: number;
  totalSteps: number;
  targetRect?: DOMRect | null;
}

export default function InstructionCard({ text, stepNumber, totalSteps, targetRect }: InstructionCardProps) {
  const { t } = useTranslation();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowClass, setArrowClass] = useState('');

  useEffect(() => {
    if (!targetRect) {
      // Default to center if no target
      setPosition({ top: window.innerHeight / 2 - 50, left: window.innerWidth / 2 - 150 });
      setArrowClass('hidden');
      return;
    }

    const cardWidth = 300;
    const cardHeight = 120; // Estimated height
    const padding = 20;

    let newTop = 0;
    let newLeft = 0;
    let arrow = '';

    // Check available space
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow > cardHeight + padding) {
      // Position below
      newTop = targetRect.bottom + padding;
      newLeft = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
      arrow = 'top-[-8px] left-1/2 -translate-x-1/2 border-b-white border-l-transparent border-r-transparent border-t-transparent';
    } else if (spaceAbove > cardHeight + padding) {
      // Position above
      newTop = targetRect.top - cardHeight - padding;
      newLeft = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
      arrow = 'bottom-[-8px] left-1/2 -translate-x-1/2 border-t-white border-l-transparent border-r-transparent border-b-transparent';
    } else {
      // Center screen fallback if no space
      newTop = window.innerHeight / 2 - cardHeight / 2;
      newLeft = window.innerWidth / 2 - cardWidth / 2;
      arrow = 'hidden';
    }

    // Keep within horizontal bounds
    if (newLeft < 10) newLeft = 10;
    if (newLeft + cardWidth > window.innerWidth - 10) newLeft = window.innerWidth - cardWidth - 10;

    setPosition({ top: newTop, left: newLeft });
    setArrowClass(arrow);
  }, [targetRect, text]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepNumber}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed z-50 w-[300px] bg-surface rounded-2xl shadow-xl border border-outline-variant p-5 pointer-events-auto"
        style={{ top: position.top, left: position.left }}
      >
        {/* Arrow pointer */}
        <div className={`absolute w-0 h-0 border-[8px] ${arrowClass}`}></div>

        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-on-primary-container bg-primary-container px-2 py-0.5 rounded-full">
            {t('guide.step_of', { current: stepNumber, total: totalSteps })}
          </div>
        </div>
        
        <p className="text-on-surface text-sm font-medium leading-relaxed">
          {text}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
