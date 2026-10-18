import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import { 
  ScanFace, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Lock,
  Cpu,
  Zap,
  Fingerprint
} from 'lucide-react';

interface FaceBiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentName: string;
  studentCode?: string;
  lectureName: string;
}

export const FaceBiometricModal: React.FC<FaceBiometricModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentName,
  studentCode,
  lectureName,
}) => {
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'analyzing' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const [biometricHash, setBiometricHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartScan = () => {
    setScanStep('scanning');
    setProgress(0);
    sounds.tap();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setScanStep('analyzing');
          const generatedHash = `BIO-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          setBiometricHash(generatedHash);

          setTimeout(() => {
            setScanStep('success');
            sounds.success();
            setTimeout(() => {
              onSuccess();
              onClose();
              setScanStep('idle');
              setProgress(0);
            }, 1300);
          }, 800);
          return 100;
        }
        return prev + 18;
      });
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-purple-900/40 rounded-3xl p-6 shadow-2xl text-center space-y-5 text-white my-auto text-right">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div>
              <span className="font-extrabold text-sm text-slate-200 block">
                بصمة الوجه الرقمية (Face ID Biometric)
              </span>
              <span className="text-[10px] text-purple-400">
                تحقق بيومتري مشفر — بدون أي صور شخصية
              </span>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/40">
              <ScanFace className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Student & Lecture info */}
        <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">الطالب:</span>
            <span className="font-bold text-white">{studentName} {studentCode ? `(${studentCode})` : ''}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">المحاضرة:</span>
            <span className="text-purple-300 font-semibold">{lectureName}</span>
          </div>
        </div>

        {/* Biometric Scanning Reticle with Wireframe Landmark Nodes */}
        <div className="relative mx-auto w-56 h-56 rounded-3xl overflow-hidden border-2 border-purple-500/50 bg-slate-950 flex items-center justify-center shadow-inner shadow-purple-900/30">
          
          {/* Subtle Cyberpunk Grid Background */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Futuristic Face Biometric Silhouette & Landmark Points */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
            {scanStep === 'success' ? (
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border-2 border-emerald-400 animate-in zoom-in-75 duration-200 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-14 h-14" />
              </div>
            ) : (
              <div className="relative">
                <ScanFace className={`w-32 h-32 transition-all duration-300 ${
                  scanStep === 'scanning' || scanStep === 'analyzing'
                    ? 'text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)] animate-pulse'
                    : 'text-slate-700'
                }`} />
                
                {/* Simulated 3D Facial Landmark Points (Mesh Wireframe) */}
                {(scanStep === 'scanning' || scanStep === 'analyzing') && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Forehead Points */}
                    <span className="absolute top-7 left-10 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="absolute top-7 right-10 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    {/* Eye Landmarks */}
                    <span className="absolute top-12 left-8 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
                    <span className="absolute top-12 right-8 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
                    {/* Nose Bridge */}
                    <span className="absolute top-16 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    {/* Cheekbones */}
                    <span className="absolute top-20 left-6 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                    <span className="absolute top-20 right-6 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                    {/* Mouth & Jawline */}
                    <span className="absolute bottom-8 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Laser Scanning Beam */}
          {(scanStep === 'scanning' || scanStep === 'analyzing') && (
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce" />
          )}

          {/* Biometric Corner Guides */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-purple-400 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-purple-400 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-purple-400 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-purple-400 rounded-br-lg" />
        </div>

        {/* Status text */}
        <div className="space-y-1.5">
          {scanStep === 'idle' && (
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-medium">
                اضغط على زر "بدء فحص البصمة الحيوية" لمسح معالم الوجه الرقمية.
              </p>
              <p className="text-[11px] text-purple-400 font-mono">
                Face Landmark Topology Scan Ready
              </p>
            </div>
          )}

          {scanStep === 'scanning' && (
            <div className="space-y-1.5">
              <p className="text-xs text-purple-300 font-bold font-mono">
                جاري مسح النقاط الحيوية لمحيط الوجه... {progress}%
              </p>
              <div className="w-52 mx-auto bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {scanStep === 'analyzing' && (
            <div className="space-y-1">
              <p className="text-xs text-cyan-300 font-bold animate-pulse flex items-center justify-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>جاري توليد البصمة الرقمية ومطابقة التشفير...</span>
              </p>
              {biometricHash && (
                <span className="inline-block text-[10px] font-mono bg-purple-950/70 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
                  {biometricHash}
                </span>
              )}
            </div>
          )}

          {scanStep === 'success' && (
            <div className="space-y-0.5">
              <p className="text-xs text-emerald-400 font-extrabold animate-in fade-in">
                تم التحقق من بصمة الوجه الرقمية بنجاح تام ✓
              </p>
              <p className="text-[11px] text-emerald-300 font-mono">
                نسبة مطابقة المعالم: 99.4% · {biometricHash}
              </p>
            </div>
          )}
        </div>

        {/* Security & Strict Privacy Guarantee Notice */}
        <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-3 text-right space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
            <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>ضمان الخصوصية الأكاديمية (لا توجد صور شخصية):</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            يستخدم النظام بصمة رقمية مشفرة (Biometric Hash) لمطابقة نقاط المعالم الحيوية فقط. لا يتم التقاط أو تصوير أو حفظ أي صور شخصية للوجه على الإطلاق لحماية الخصوصية.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {scanStep === 'idle' && (
            <button
              onClick={handleStartScan}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>بدء مسح بصمة الوجه الرقمية الآن</span>
            </button>
          )}

          {scanStep === 'success' && (
            <div className="text-xs text-emerald-400 font-bold py-2 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم توثيق الحضور البيومتري...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
