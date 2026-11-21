import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { appAsset } from '../utils/assetPath';

interface IntroSplashProps {
  onDismiss: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onDismiss }) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 2200);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-label="شاشة الترحيب"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#050811' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col items-center gap-4"
      >
        <img
          src={appAsset('brand.svg')}
          alt="شعار لمة البيت"
          className="h-20 w-20 rounded-2xl shadow-2xl"
        />
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          لمة البيت
        </h1>
        <p className="max-w-sm text-sm font-medium text-slate-300">
          سينما العيلة، الحكايات الهادئة، وذكرياتنا الجميلة في مكان واحد
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="mt-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
        >
          تخطي الدخول الآن
        </button>
      </motion.div>
    </div>
  );
};
