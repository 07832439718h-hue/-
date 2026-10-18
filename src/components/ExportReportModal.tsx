import React, { useState } from 'react';
import { StudentAttendanceRecord } from '../types/attendance';
import { exportAttendanceToExcel, exportAttendanceToCSV } from '../utils/appsheetExport';
import { sounds } from '../utils/audio';
import { 
  FileSpreadsheet, 
  X, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle,
  Table,
  Cloud,
  FileCheck
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StudentAttendanceRecord[];
  title?: string;
  defaultFilename?: string;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  records,
  title = 'تصدير كشف حضور المحاضرة',
  defaultFilename = 'كشف_حضور_المحاضرة',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv_semicolon' | 'csv_comma'>('excel');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    sounds.tap();
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseName = `${defaultFilename}_${dateStr}`;

    if (selectedFormat === 'excel') {
      exportAttendanceToExcel(records, `${baseName}.xls`);
    } else if (selectedFormat === 'csv_semicolon') {
      exportAttendanceToCSV(records, `${baseName}_Excel_Arabic.csv`, ';');
    } else {
      exportAttendanceToCSV(records, `${baseName}_AppSheet.csv`, ',');
    }

    setDownloadSuccess(true);
    sounds.success();
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900 my-auto text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                إجمالي السجلات الجاهزة للتصدير: <strong className="text-slate-800">{records.length} طالب</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative banner about fixing Excel corruption */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>معالجة تشوه جداول Excel في اللغة العربية:</span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            عند فتح ملفات CSV العادية في برنامج إكسل على أنظمة ويندوز العربية، قد تظهر البيانات مشوهة أو متجمعة في عمود واحد. اختر الصيغة المناسبة لك أدناه للحصول على جدول منظم 100%.
          </p>
        </div>

        {/* Format Options */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700">
            اختر صيغة الملف المطلوبة:
          </label>

          {/* Option 1: Native Excel .xls (Recommended) */}
          <div
            onClick={() => setSelectedFormat('excel')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              selectedFormat === 'excel'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
              selectedFormat === 'excel' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {selectedFormat === 'excel' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ملف Microsoft Excel رسمي (.xls)</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  موصى به لإكسل ★
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                يفتح مباشرة في مايكروسوفت إكسل بأعمدة مفصولة، واتجاه من اليمين لليسار (RTL)، وبألوان مميزة لحالات الحضور دون أي تشويه للأحرف العربية.
              </p>
            </div>
          </div>

          {/* Option 2: CSV Semicolon (Arabic Windows Excel friendly) */}
          <div
            onClick={() => setSelectedFormat('csv_semicolon')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              selectedFormat === 'csv_semicolon'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
              selectedFormat === 'csv_semicolon' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {selectedFormat === 'csv_semicolon' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="space-y-1 flex-1">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-blue-600" />
                <span>ملف CSV متوافق مع إكسل العربي (فاصلة منقوطة ;)</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                مزود بترميز UTF-8 نقي وفاصلة منقوطة تمنع تجمع البيانات في عمود واحد على أجهزة ويندوز التي تستخدم الإعدادات الإقليمية العربية.
              </p>
            </div>
          </div>

          {/* Option 3: Standard CSV (AppSheet & Google Sheets) */}
          <div
            onClick={() => setSelectedFormat('csv_comma')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              selectedFormat === 'csv_comma'
                ? 'border-purple-500 bg-purple-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
              selectedFormat === 'csv_comma' ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {selectedFormat === 'csv_comma' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="space-y-1 flex-1">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-purple-600" />
                <span>ملف CSV قياسي لـ Google Sheets و AppSheet (فاصلة ,)</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                مخصص للرفع المباشر إلى منصات Google Cloud و AppSheet وقواعد البيانات السحابية مع ترميز UTF-8 عربي.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              downloadSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : records.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
            }`}
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تم تجهيز وتحميل الملف بنجاح! ✓</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل الكشف الآن ({records.length} سجل)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
