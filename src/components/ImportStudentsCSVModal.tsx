import React, { useState, useRef } from 'react';
import { UserAccount, StudyType } from '../types/attendance';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  FileText,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface ImportStudentsCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (newStudents: UserAccount[]) => void;
  existingUsers: UserAccount[];
  defaultCollege: string;
  defaultUniversity: string;
}

interface ParsedStudentRow {
  code: string;
  name: string;
  email: string;
  stage: string;
  group: string;
  studyType: StudyType;
  isValid: boolean;
  errorReason?: string;
}

export const ImportStudentsCSVModal: React.FC<ImportStudentsCSVModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
  existingUsers,
  defaultCollege,
  defaultUniversity,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and download a sample CSV file
  const handleDownloadSampleCSV = () => {
    const csvHeader = 'Student Code,Name,Email,Stage,Group,Study Type\n';
    const sampleData = [
      '101,علي حسن كاظم,ali.hassan@univ.edu.iq,المرحلة الثانية,A,صباحي',
      '102,زينب علاء مهدي,zainab.alaa@univ.edu.iq,المرحلة الثانية,A,صباحي',
      '103,محمد جاسم حميد,mohammed.jasim@univ.edu.iq,المرحلة الثانية,B,مسائي',
      '104,سارة أحمد عبد الحسين,sara.ahmed@univ.edu.iq,المرحلة الثانية,B,صباحي',
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + sampleData], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'نموذج_استيراد_الطلاب_جامعة_بابل.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    sounds.playClick();
  };

  // Parse CSV text
  const parseCSVContent = (content: string) => {
    setGeneralError(null);
    const lines = content
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      setGeneralError('الملف فارغ أو يحتوي على صف العناوين فقط.');
      return;
    }

    const firstLine = lines[0].toLowerCase();
    // Delimiter check: comma or semicolon or tab
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    const rawHeaders = firstLine.split(delimiter).map((h) => h.replace(/["']/g, '').trim());

    // Map header indices
    let codeIdx = rawHeaders.findIndex((h) => h.includes('code') || h.includes('رمز') || h.includes('رقم') || h.includes('id'));
    let nameIdx = rawHeaders.findIndex((h) => h.includes('name') || h.includes('اسم') || h.includes('طالب'));
    let emailIdx = rawHeaders.findIndex((h) => h.includes('email') || h.includes('إيميل') || h.includes('بريد'));
    let stageIdx = rawHeaders.findIndex((h) => h.includes('stage') || h.includes('مرحلة'));
    let groupIdx = rawHeaders.findIndex((h) => h.includes('group') || h.includes('شعبة') || h.includes('مجموعة'));
    let studyIdx = rawHeaders.findIndex((h) => h.includes('study') || h.includes('دراسة') || h.includes('نوع'));

    // Fallbacks if headers not detected
    if (codeIdx === -1) codeIdx = 0;
    if (nameIdx === -1) nameIdx = 1;
    if (emailIdx === -1) emailIdx = 2;
    if (stageIdx === -1) stageIdx = 3;
    if (groupIdx === -1) groupIdx = 4;
    if (studyIdx === -1) studyIdx = 5;

    const existingCodes = new Set(
      existingUsers.filter((u) => u.role === 'student' && u.studentCode).map((u) => u.studentCode!.toLowerCase())
    );
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const parsed: ParsedStudentRow[] = [];
    const seenCodesInFile = new Set<string>();
    const seenEmailsInFile = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(delimiter).map((col) => col.replace(/["']/g, '').trim());
      if (row.length < 2) continue;

      const code = row[codeIdx] || `STU-${Date.now().toString().slice(-4)}${i}`;
      const name = row[nameIdx] || '';
      let email = row[emailIdx] || '';
      const stage = row[stageIdx] || 'المرحلة الثانية';
      const group = row[groupIdx] || 'A';
      const studyRaw = (row[studyIdx] || 'صباحي').toLowerCase();
      const studyType: StudyType = studyRaw.includes('مسائي') ? 'مسائي' : 'صباحي';

      // Auto generate email if empty
      if (!email || !email.includes('@')) {
        const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
        email = `student.${cleanCode || i}@babylon.edu.iq`;
      }

      let isValid = true;
      let errorReason: string | undefined = undefined;

      if (!name) {
        isValid = false;
        errorReason = 'الاسم فارغ';
      } else if (existingCodes.has(code.toLowerCase())) {
        isValid = false;
        errorReason = 'رمز الطالب مسجل مسبقاً بالنظام';
      } else if (seenCodesInFile.has(code.toLowerCase())) {
        isValid = false;
        errorReason = 'رمز مكرر داخل هذا الملف';
      } else if (existingEmails.has(email.toLowerCase())) {
        isValid = false;
        errorReason = 'البريد مسجل مسبقاً لمستخدم آخر';
      } else if (seenEmailsInFile.has(email.toLowerCase())) {
        isValid = false;
        errorReason = 'البريد مكرر داخل هذا الملف';
      }

      if (isValid) {
        seenCodesInFile.add(code.toLowerCase());
        seenEmailsInFile.add(email.toLowerCase());
      }

      parsed.push({
        code,
        name,
        email,
        stage,
        group,
        studyType,
        isValid,
        errorReason,
      });
    }

    setParsedRows(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVContent(text);
      setIsProcessing(false);
      sounds.playClick();
    };
    reader.onerror = () => {
      setGeneralError('تعذر قراءة الملف. تأكد من أن الملف بصيغة CSV صالحة.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;

    const newStudents: UserAccount[] = validRows.map((r, idx) => ({
      id: `USR-IMP-${Date.now().toString().slice(-6)}-${idx}`,
      name: r.name,
      email: r.email,
      role: 'student',
      studentCode: r.code,
      stage: r.stage,
      group: r.group,
      college: defaultCollege,
      university: defaultUniversity,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    }));

    onImportStudents(newStudents);
    sounds.playSuccessChime();
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-5 my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                استيراد قائمة الطلاب دفعة واحدة (ملف CSV)
              </h3>
              <p className="text-xs text-slate-500">
                إعداد البيانات الأولية للطلبة من Excel أو Google Sheets بنقرة واحدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generalError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Upload Box & Template Download */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="md:col-span-2 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-5 text-center bg-emerald-50/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-xs block">
                {fileName ? `الملف المختار: ${fileName}` : 'اضغط لاختيار ملف CSV أو اسحبه هنا'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                يدعم ترميز UTF-8 واللغة العربية والأعمدة المطابقة لـ AppSheet
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>نموذج ملف CSV جاهز:</span>
              </span>
              <p className="text-[11px] text-slate-500">
                حمل الملف المنسق وجربه مباشرة في Excel ثم أعد رفعه هنا.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleCSV}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحميل نموذج CSV</span>
            </button>
          </div>

        </div>

        {/* Preview of Parsed Rows */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>معاينة بيانات الملف ({parsedRows.length} طالب):</span>
              </span>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg font-bold">
                  صالح للاستيراد: {validRows.length}
                </span>
                {invalidRows.length > 0 && (
                  <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-lg font-bold">
                    مستبعد / مكرر: {invalidRows.length}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-2 px-3">الحالة</th>
                    <th className="py-2 px-3">Student Code</th>
                    <th className="py-2 px-3">الاسم الكامل</th>
                    <th className="py-2 px-3">المرحلة والشعبة</th>
                    <th className="py-2 px-3">نوع الدراسة</th>
                    <th className="py-2 px-3">البريد الإلكتروني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 text-slate-400'}
                    >
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>جاهز</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[10px]" title={r.errorReason}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{r.errorReason || 'مستبعد'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{r.code}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{r.name}</td>
                      <td className="py-2 px-3">{r.stage} ({r.group})</td>
                      <td className="py-2 px-3">{r.studyType}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{r.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            * سيتم حفظ كافة الطلاب مباشرة في قاعدة بيانات النظام وربطهم بجداول AppSheet.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>تأكيد واستيراد ({validRows.length}) طالب الآن</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
