import React, { useState } from 'react';
import { 
  GOOGLE_APPS_SCRIPT_TEMPLATE, 
  sendAttendanceToGoogleSheets 
} from '../utils/googleSheetsSync';
import { UniversitySettings, StudentAttendanceRecord } from '../types/attendance';
import { 
  FileSpreadsheet, 
  Cloud, 
  Check, 
  Copy, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  X, 
  AlertCircle,
  Play
} from 'lucide-react';

interface GoogleSheetsWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UniversitySettings;
  onUpdateSettings: (settings: UniversitySettings) => void;
  sampleRecord?: StudentAttendanceRecord;
}

export const GoogleSheetsWebhookModal: React.FC<GoogleSheetsWebhookModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  sampleRecord,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(settings.googleSheetsWebhookUrl || '');
  const [autoSync, setAutoSync] = useState(settings.autoSyncToGoogleSheets ?? true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      ...settings,
      googleSheetsWebhookUrl: webhookUrl.trim(),
      autoSyncToGoogleSheets: autoSync,
    });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({ success: false, message: 'يرجى إدخال رابط Web App أولاً' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const testPayload: StudentAttendanceRecord = sampleRecord || {
      id: 'TEST-' + Date.now(),
      studentCode: 'NUR-TEST-01',
      group: 'A1',
      name: 'طالب تجريبي للاختبار',
      timestamp: new Date().toLocaleString('ar-IQ'),
      location: 'مدرج كلية التمريض (فحص اتصال تجريبي)',
      lectureName: 'تمريض باطني وجراحي (نظري)',
      startTime: '08:30',
      endTime: '10:30',
      attendanceStatus: 'حاضر',
      delayMinutes: 0,
      weekDays: 'الأحد',
      studyType: 'صباحي',
      email: 'student.test@uobabylon.edu.iq',
      college: settings.college,
      university: settings.university,
      stage: 'المرحلة الثانية',
      lecturerName: 'أ.م.د. أحمد حسن البابلي',
      teacherEmail: 'dr.ahmed.babylon@uobabylon.edu.iq',
      lecturePlace: 'مدرج كلية التمريض - الطابق الأول',
    };

    const res = await sendAttendanceToGoogleSheets(webhookUrl, testPayload);
    setTesting(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl space-y-5 text-right my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                الربط المباشر اللحظي مع Google Sheets
              </h3>
              <p className="text-[11px] text-slate-500">
                تسجيل الحضور تلقائياً وفوراً في جدول Google Sheets السحابي دون الحاجة للتصدير اليدوي
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

        {/* Feature Overview */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
          <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">كيف تجعل التطبيق يرسل البيانات إلى شيت Google في ثوانٍ؟</span>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              عند تفعيل هذا الربط، بمجرد أن يضغط الطالب داخل القاعة على <span className="font-bold">"تسجيل الحضور الآن"</span>، سيقوم التطبيق بإرسال سطر الحضور متضمناً كافة الحقول المطلوبة (كود الطالب، الشعبة، الاسم، الوقت، GPS، المحاضرة، الأستاذ...) مباشرة إلى شيت Google المربوط بتطبيقك في AppSheet.
            </p>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800">
            خطوات الإعداد السريعة (تأخذ دقيقة واحدة فقط):
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold font-mono">
                1
              </span>
              <p className="font-bold text-slate-800">افتح جدول البيانات</p>
              <p className="text-[11px] text-slate-500">
                في Google Sheets، اختر من القائمة: <br />
                <span className="font-semibold text-slate-700">Extensions &gt; Apps Script</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold font-mono">
                2
              </span>
              <p className="font-bold text-slate-800">الصق الكود البرمجي</p>
              <p className="text-[11px] text-slate-500">
                انسخ الكود الجاهز أدناه واستبدل أي محتوى في ملف <span className="font-mono text-slate-700">Code.gs</span> ثم احفظ.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold font-mono">
                3
              </span>
              <p className="font-bold text-slate-800">انشر الـ Web App</p>
              <p className="text-[11px] text-slate-500">
                اضغط <span className="font-semibold text-slate-700">Deploy &gt; New deployment &gt; Web app</span>، واختر صلاحية الوصول: <span className="font-bold text-emerald-700">Anyone</span>، والصق الرابط هنا.
              </p>
            </div>
          </div>
        </div>

        {/* Ready Apps Script Code snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              الكود الجاهز لـ Google Apps Script (Code.gs):
            </label>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'تم النسخ للحافظة!' : 'نسخ الكود بالكامل'}</span>
            </button>
          </div>
          <div className="relative">
            <pre className="p-3.5 bg-slate-900 text-blue-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40 ltr text-left">
              {GOOGLE_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>
        </div>

        {/* Webhook URL Input & Test */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              رابط تطبيق الويب (Google Apps Script Web App URL):
            </label>
            <input
              type="url"
              dir="ltr"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>تفعيل المزامنة التلقائية اللحظية عند تسجيل كل طالب</span>
            </label>

            <button
              type="button"
              disabled={testing || !webhookUrl.trim()}
              onClick={handleTestConnection}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 rounded-lg text-xs font-bold transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-blue-600" />
              <span>{testing ? 'جارِ فحص الاتصال...' : 'تجربة إرسال سطر اختبار (Ping)'}</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}>
              {testResult.success ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            إلغاء
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>حفظ إعدادات الربط المباشر</span>
          </button>
        </div>

      </div>
    </div>
  );
};
