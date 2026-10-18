import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, ExternalLink, QrCode } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'compact' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running as standalone app, don't show the prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    sounds.playClick();

    // If iOS Safari, beforeinstallprompt is never provided by WebKit; show guidance
    if (isIOS) {
      setShowGuide(true);
      return;
    }

    // If native prompt is captured and ready, trigger it directly!
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const result = await install();
        if (result === 'accepted') {
          sounds.playSuccessChime();
          setInstallSuccess(true);
          setTimeout(() => setInstallSuccess(false), 4000);
        }
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If not yet available (e.g. running inside iframe preview or desktop before engagement check)
      setShowGuide(true);
    }
  };

  const handleOpenDirect = () => {
    sounds.playClick();
    // Open in top window or standalone tab so browser can trigger beforeinstallprompt natively
    window.open(window.location.href, '_blank');
  };

  return (
    <>
      {/* 1. Header Variant */}
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ${className}`}
          title="تثبيت التطبيق على الشاشة الرئيسية لهاتفك كـ PWA"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-200 ring-2 ring-emerald-300/40"></span>
          <Smartphone className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق (PWA)</span>
        </button>
      )}

      {/* 2. Login Screen Variant */}
      {variant === 'login' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 rounded-xl text-xs font-bold backdrop-blur-sm transition-all duration-200 active:scale-95 shadow-sm cursor-pointer ${className}`}
          title="تثبيت التطبيق على جهازك"
        >
          <Download className="w-3.5 h-3.5 text-emerald-300" />
          <span>تثبيت التطبيق (PWA)</span>
        </button>
      )}

      {/* 3. Compact Variant */}
      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors shadow-xs active:scale-95 cursor-pointer ${className}`}
          title="تثبيت التطبيق (PWA)"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>تثبيت التطبيق (PWA)</span>
        </button>
      )}

      {/* 4. Banner Variant (e.g. Student Portal) */}
      {variant === 'banner' && (
        <div className={`bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base text-white">تثبيت التطبيق على هاتفك المحمول (PWA)</h4>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                  تطبيق فوري
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                ثبّت التطبيق مباشرة ليعمل كتطبيق أصلي سريع مع دعم كامل للـ GPS دون الحاجة لمتجر التطبيقات.
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>{isInstalling ? 'جارِ فتح نافذة التثبيت...' : 'تثبيت التطبيق (PWA)'}</span>
          </button>
        </div>
      )}

      {/* Success Toast */}
      {installSuccess && (
        <div className="fixed bottom-5 left-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>تم تثبيت التطبيق بنجاح! يمكنك الآن فتحه من شاشتك الرئيسية.</span>
        </div>
      )}

      {/* Fallback & Guided Installation Modal (for iOS or Iframe Preview) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span>تثبيت نظام حضور المحاضرات الذكي</span>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isInIframe && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <p className="font-semibold">
                  ملاحظة للمعاينة: متصفحات الويب تمنع نافذة التثبيت التلقائية داخل إطارات المعاينة (iFrames) لأسباب أمنية.
                </p>
                <button
                  onClick={handleOpenDirect}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح التطبيق في نافذة مستقلة لتشغيل التثبيت الرسمي</span>
                </button>
              </div>
            )}

            <div className="space-y-3">
              {/* iOS Instructions */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-mono">
                    
                  </span>
                  <span>على هواتف iPhone (متصفح Safari):</span>
                </div>
                <div className="space-y-1.5 text-slate-600 pr-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">1.</span>
                    <span>اضغط على زر المشاركة <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> في شريط Safari.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">2.</span>
                    <span>انزل لأسفل واختر <strong className="text-slate-900">"إضافة إلى الشاشة الرئيسية"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" />.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">3.</span>
                    <span>اضغط <strong className="text-emerald-700">"إضافة" (Add)</strong> في الزاوية العلوية.</span>
                  </div>
                </div>
              </div>

              {/* Android Instructions */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-mono">
                    Android
                  </span>
                  <span>على هواتف Android (متصفح Chrome):</span>
                </div>
                <div className="space-y-1.5 text-slate-600 pr-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">1.</span>
                    <span>اضغط على قائمة الثلاث نقاط العلوية (⋮) في متصفح Chrome.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">2.</span>
                    <span>اضغط على <strong className="text-slate-900">"تثبيت التطبيق" (Install App)</strong> لتثبيته كـ PWA كامل بدلاً من اختصار.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>بعد التثبيت، سيعمل التطبيق بشاشته الكاملة بدون أشرطة المتصفح ومع دعم Offline.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
