import React, { useState } from 'react';
import { 
  downloadAppSheetStarterTemplate, 
  exportAttendanceToCSV, 
  exportLecturesToCSV 
} from '../utils/appsheetExport';
import { 
  INITIAL_ATTENDANCE_RECORDS, 
  INITIAL_LECTURES, 
  BABYLON_NURSING_STUDENTS 
} from '../data/initialData';
import { downloadCSV } from '../utils/appsheetExport';
import { 
  FileSpreadsheet, 
  Download, 
  Check, 
  Copy, 
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  KeyRound,
  Smartphone,
  Globe,
  Share2,
  ExternalLink,
  Sparkles,
  Zap
} from 'lucide-react';

interface AppSheetGuideModalProps {
  onResetData: () => void;
  onImportStudents?: (students: any[]) => void;
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
}

export const AppSheetGuideModal: React.FC<AppSheetGuideModalProps> = ({
  onResetData,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadStudentsRoster = () => {
    const headers = ['Student Code', 'Name', 'Group', 'نوع الدراسة', 'College', 'University', 'Stage'];
    const rows = BABYLON_NURSING_STUDENTS.map((s) => [
      `"${s.code}"`,
      `"${s.name}"`,
      `"${s.group}"`,
      `"${s.study}"`,
      '"كلية التمريض"',
      '"جامعة بابل"',
      '"المرحلة الثانية"',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSV('Babylon_Nursing_Students_Roster.csv', csv);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>دليل التحويل إلى تطبيق واقعي ونشره على هواتف الطلاب والأساتذة</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          كيف تحوّل هذا النظام إلى تطبيق واقعي على أرض الواقع؟
        </h2>
        
        <p className="text-sm text-blue-100 max-w-3xl leading-relaxed">
          لديك مساران متكاملان ومجربان لتشغيل النظام غداً مع طلاب كلية التمريض - جامعة بابل: مسار تطبيق الويب الفوري (PWA) الذي يعمل مباشرة على أي هاتف، ومسار منصة Google AppSheet مع جداول Google Sheets.
        </p>

        {/* Ready CSV Downloads Strip */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => exportLecturesToCSV(INITIAL_LECTURES)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تحميل جدول المحاضرات (CSV)</span>
          </button>

          <button
            onClick={handleDownloadStudentsRoster}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تحميل قائمة الطلاب 150+ (CSV)</span>
          </button>

          <button
            onClick={() => exportAttendanceToCSV(INITIAL_ATTENDANCE_RECORDS)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>تحميل سجل الحضور المعتمد (CSV)</span>
          </button>
        </div>
      </div>

      {/* Path 1: Instant PWA Mobile Installation (Ready Right Now!) */}
      <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                المسار الأول (جاهز للتشغيل فوراً خلال دقيقة واحدة)
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                تثبيت التطبيق مباشرة على هواتف الطلاب والأساتذة (PWA)
              </h3>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg hidden sm:block">
            مجاني 100% وبدون متجر تطبيقات
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          هذا التطبيق مجهز بملف <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">manifest.webmanifest</code> وتقنية الـ PWA، مما يتيح تثبيته كتطبيق هاتف رسمي يعمل بملء الشاشة مع حفظ البيانات والموقع الجغرافي:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5">
              <span>📱 على هواتف iPhone (متصفح Safari):</span>
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>افتح رابط التطبيق الحالي في متصفح Safari على هاتف الآيفون.</li>
              <li>اضغط على زر المشاركة السفلي (مربع بسهم لأعلى 📤).</li>
              <li>اختر <span className="font-bold text-slate-800">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</li>
              <li>سيظهر التطبيق بأيقونته واسمه "حضور بابل" على شاشة هاتفك مثل أي تطبيق مثبت.</li>
            </ol>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5">
              <span>🤖 على هواتف Android (متصفح Chrome):</span>
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>افتح رابط التطبيق في متصفح Google Chrome على هاتف الطالب.</li>
              <li>اضغط على النقاط الثلاث العلوية (⋮) في المتصفح.</li>
              <li>اضغط على <span className="font-bold text-slate-800">"تثبيت التطبيق" (Install App)</span>.</li>
              <li>سيعمل التطبيق بملء الشاشة وبدون شريط عنوان المتصفح.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Path 2: Google AppSheet Native Step-by-Step */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              المسار الثاني (منصة Google AppSheet الرسمية)
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              خطوات إنشاء التطبيق في Google AppSheet خطوة بخطوة
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* Step 1 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center font-mono">1</span>
              <span>الخطوة 1: تجهيز ملف Google Sheets</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              افتح <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Sheets</a> وأنشئ ملفاً باسم <span className="font-bold text-slate-800">"حضور كلية التمريض - جامعة بابل"</span>، ثم أنشئ 3 أوراق عمل (Tabs):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-bold text-blue-800 block">ورقة 1: Students</span>
                <span className="text-slate-500 text-[10px]">قائمة الطلاب (استورد ملف CSV للطلاب)</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-bold text-blue-800 block">ورقة 2: Lectures</span>
                <span className="text-slate-500 text-[10px]">جدول المحاضرات (استورد ملف CSV للمحاضرات)</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="font-bold text-blue-800 block">ورقة 3: Attendance</span>
                <span className="text-slate-500 text-[10px]">سجل حضور الطلاب المطلوب</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center font-mono">2</span>
              <span>الخطوة 2: توليد تطبيق AppSheet من الشيت</span>
            </div>
            <p className="text-slate-600">
              داخل Google Sheets، اذهب إلى القائمة العلوية:
            </p>
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-700 flex-wrap">
              <span>Extensions</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>AppSheet</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600">Create an app</span>
            </div>
            <p className="text-[11px] text-slate-500">
              سيقوم AppSheet ببناء التطبيق في ثوانٍ وربطه ببياناتك مباشرة.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center font-mono">3</span>
              <span>الخطوة 3: نسخ ولصق صيغ التحقق الأمني بالـ GPS وبصمة الجهاز</span>
            </div>

            <div className="space-y-2">
              {/* Formula GPS */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">صيغة التحقق من قاعة كلية التمريض - جامعة بابل:</span>
                  <button
                    onClick={() => handleCopyCode('bab-gps', `DISTANCE(HERE(), LATLONG(32.274176, 44.805896)) <= 0.1`)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    {copiedSection === 'bab-gps' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'bab-gps' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <code className="font-mono text-[11px] text-blue-900 block overflow-x-auto select-all">
                  DISTANCE(HERE(), LATLONG(32.274176, 44.805896)) &lt;= 0.1
                </code>
              </div>

              {/* Formula Roles */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">صيغة إظهار محاضرات الأستاذ فقط:</span>
                  <button
                    onClick={() => handleCopyCode('prof-filter', `[Teacher Email] = USEREMAIL()`)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    {copiedSection === 'prof-filter' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'prof-filter' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <code className="font-mono text-[11px] text-purple-900 block overflow-x-auto select-all">
                  [Teacher Email] = USEREMAIL()
                </code>
              </div>

              {/* Formula Student Add-Only */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">صيغة قفل التعديل على الطالب (إضافة فقط):</span>
                  <button
                    onClick={() => handleCopyCode('stu-noedit', `IF(USEREMAIL() = "07832439718h@gmail.com", TRUE, FALSE)`)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    {copiedSection === 'stu-noedit' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'stu-noedit' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <code className="font-mono text-[11px] text-rose-900 block overflow-x-auto select-all">
                  IF(USEREMAIL() = "07832439718h@gmail.com", TRUE, FALSE)
                </code>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center font-mono">4</span>
              <span>الخطوة 4: مشاركة رابط التطبيق مع طلبة وأساتذة الكلية</span>
            </div>
            <p className="text-slate-600">
              في AppSheet، اضغط على زر <span className="font-bold text-slate-800">Share</span> وانسخ رابط <span className="font-bold text-blue-700">Install Link</span> وأرسله في قناة التلغرام أو الواتساب الخاصة بطلبة المرحلة الثانية لكلية التمريض.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
