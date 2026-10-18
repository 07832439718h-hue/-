import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Printer, 
  X, 
  Smartphone,
  Sparkles
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  collegeName: string;
  universityName: string;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  collegeName,
  universityName,
}) => {
  const [appUrl, setAppUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setAppUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUri) => setQrDataUrl(dataUri))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `رابط نظام حضور المحاضرات الذكي (${collegeName} - ${universityName}):\n${appUrl}\n\nيرجى الدخول وتسجيل الحضور داخل القاعة.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-5 text-right animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                مشاركة التطبيق مع الطلاب في القاعة
              </h3>
              <p className="text-[11px] text-slate-500">
                امسح الرمز أو انسخ الرابط لدخول الطلاب الفوري
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Presentation for Projector */}
        <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code للتطبيق"
                className="w-56 h-56 object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                جارِ توليد الرمز...
              </div>
            )}
          </div>
          
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>وجّه كاميرا الهاتف نحو الرمز لفتح التطبيق وتثبيته</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {collegeName} — {universityName}
            </p>
          </div>
        </div>

        {/* Quick URL Copy Bar */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            رابط التطبيق المباشر (يمكنك إرساله في جروب التيليجرام أو الواتساب):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 ltr select-all focus:outline-hidden"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة عبر واتساب</span>
          </button>

          <button
            onClick={handlePrintPoster}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors border border-slate-300"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة بوستر للقاعة</span>
          </button>
        </div>

      </div>
    </div>
  );
};
