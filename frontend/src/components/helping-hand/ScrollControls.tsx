import { useTranslation } from 'react-i18next';
import { useHelpingHandStore } from './helpingHandStore';
import { ArrowDown, ArrowUp, ArrowUpToLine, ArrowDownToLine, ChevronDown, ChevronLeft } from 'lucide-react';

export function ScrollControls() {
  const { t } = useTranslation();
  const { setActiveTab } = useHelpingHandStore();

  const handleScrollDown = () => {
    window.scrollBy({ top: 380, behavior: 'smooth' });
  };

  const handleScrollUp = () => {
    window.scrollBy({ top: -380, behavior: 'smooth' });
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleNextSection = () => {
    // Find headings, sections, or cards below the current scroll offset
    const currentY = window.scrollY + 120;
    const candidates = Array.from(
      document.querySelectorAll('section, article, form, h1, h2, h3, [data-section]')
    ) as HTMLElement[];

    const nextEl = candidates.find((el) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      return top > currentY;
    });

    if (nextEl) {
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Fallback: scroll down
      handleScrollDown();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-1">
      {/* Back button */}
      <button
        onClick={() => setActiveTab('main')}
        className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:underline mb-1 w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t('helping_hand.back_to_menu', { defaultValue: 'Back to Menu' })}</span>
      </button>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Scroll Down */}
        <button
          onClick={handleScrollDown}
          className="flex flex-col items-center justify-center gap-2 p-4 min-h-[72px] rounded-2xl bg-amber-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-stone-700 active:scale-98 transition-all text-stone-900 dark:text-stone-100 shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <ArrowDown className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-center">
            {t('helping_hand.scroll_down', { defaultValue: 'Scroll Down' })}
          </span>
        </button>

        {/* Scroll Up */}
        <button
          onClick={handleScrollUp}
          className="flex flex-col items-center justify-center gap-2 p-4 min-h-[72px] rounded-2xl bg-amber-50 dark:bg-stone-800 border-2 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-stone-700 active:scale-98 transition-all text-stone-900 dark:text-stone-100 shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <ArrowUp className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-center">
            {t('helping_hand.scroll_up', { defaultValue: 'Scroll Up' })}
          </span>
        </button>

        {/* Next Section */}
        <button
          onClick={handleNextSection}
          className="col-span-2 flex items-center justify-center gap-3 p-3.5 min-h-[56px] rounded-2xl bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-600 hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-98 transition-all text-amber-950 dark:text-amber-100 shadow-sm"
        >
          <ChevronDown className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          <span className="font-bold text-base">
            {t('helping_hand.next_section', { defaultValue: 'Next Section' })}
          </span>
        </button>

        {/* Go to Top */}
        <button
          onClick={handleScrollTop}
          className="flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
        >
          <ArrowUpToLine className="w-4 h-4" />
          <span className="text-xs font-semibold">
            {t('helping_hand.go_top', { defaultValue: 'Go to Top' })}
          </span>
        </button>

        {/* Go to Bottom */}
        <button
          onClick={handleScrollBottom}
          className="flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span className="text-xs font-semibold">
            {t('helping_hand.go_bottom', { defaultValue: 'Go to Bottom' })}
          </span>
        </button>
      </div>
    </div>
  );
}
