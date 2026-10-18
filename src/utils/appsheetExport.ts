import { StudentAttendanceRecord, Lecture } from '../types/attendance';

/**
 * Helper to safely escape any cell value for CSV format
 * Cleans newlines and carriage returns that break rows in Microsoft Excel
 */
const escapeCSVCell = (val: any): string => {
  if (val === null || val === undefined) return '""';
  // Replace linebreaks with spaces so rows don't get truncated or split in Excel
  const str = String(val).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Downloads a CSV file with:
 * 1. Pure Unicode UTF-8 BOM character ('\uFEFF') so Microsoft Excel detects UTF-8 Arabic encoding cleanly
 * 2. NO 'sep=,' directive which was corrupting the first row and breaking modern Excel parsers
 */
export const downloadCSV = (filename: string, csvContent: string): void => {
  // Pure UTF-8 BOM character ('\uFEFF') natively encoded by Blob into 0xEF, 0xBB, 0xBF
  const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a native Microsoft Excel spreadsheet (.xls)
 * Guarantees 100% crystal-clear Arabic rendering, native columns, and Right-to-Left (RTL) layout
 * This is the ultimate fix for any Excel CSV distortion on Windows & Mac
 */
export const exportAttendanceToExcel = (records: StudentAttendanceRecord[], customFilename?: string): void => {
  const filename = customFilename 
    ? (customFilename.endsWith('.xls') || customFilename.endsWith('.xlsx') ? customFilename : `${customFilename.replace(/\.csv$/, '')}.xls`)
    : `كشف_حضور_الطلاب_${new Date().toISOString().slice(0, 10)}.xls`;

  const rowsHtml = records.map((r, idx) => {
    const statusBg = r.attendanceStatus === 'حاضر' ? '#dcfce7; color: #166534' : r.attendanceStatus === 'متأخر' ? '#fef3c7; color: #92400e' : '#fee2e2; color: #991b1b';
    const biometricBg = r.faceVerified ? '#f3e8ff; color: #6b21a8' : '#f1f5f9; color: #64748b';
    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="font-family: Arial, sans-serif; mso-number-format:'\\@'; font-weight: bold; text-align: center; color: #1d4ed8; border: 1px solid #cbd5e1; padding: 8px;">${r.studentCode || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.group || ''}</td>
        <td style="font-family: Arial, sans-serif; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px;">${r.name || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px; direction: ltr;">${r.timestamp || ''}</td>
        <td style="font-family: Arial, sans-serif; border: 1px solid #cbd5e1; padding: 8px;">${r.location || ''}</td>
        <td style="font-family: Arial, sans-serif; font-weight: 600; border: 1px solid #cbd5e1; padding: 8px;">${r.lectureName || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.startTime || ''} - ${r.endTime || ''}</td>
        <td style="font-family: Arial, sans-serif; font-weight: bold; text-align: center; background-color: ${statusBg}; border: 1px solid #cbd5e1; padding: 8px;">${r.attendanceStatus || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.delayMinutes > 0 ? `${r.delayMinutes} دقيقة` : 'لا يوجد'}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; background-color: ${biometricBg}; font-weight: 600; border: 1px solid #cbd5e1; padding: 8px;">${r.faceVerified ? 'موثق بالبصمة ✓' : 'اختياري / عادي'}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.studyType || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.stage || ''}</td>
        <td style="font-family: Arial, sans-serif; border: 1px solid #cbd5e1; padding: 8px;">${r.lecturerName || ''}</td>
        <td style="font-family: Arial, sans-serif; border: 1px solid #cbd5e1; padding: 8px;">${r.lecturePlace || ''}</td>
        <td style="font-family: Arial, sans-serif; mso-number-format:'\\@'; border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; color: #64748b;">${r.deviceId || ''}</td>
      </tr>
    `;
  }).join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>كشف الحضور الرسمي</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                  <x:Selected/>
                  <x:ProtectContents>False</x:ProtectContents>
                  <x:ProtectObjects>False</x:ProtectObjects>
                  <x:ProtectScenarios>False</x:ProtectScenarios>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th { background-color: #0f172a; color: #ffffff; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; font-weight: bold; border: 1px solid #334155; padding: 10px; }
          td { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; }
        </style>
      </head>
      <body dir="rtl">
        <h2 style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; text-align: center; color: #0f172a; margin-bottom: 5px;">
          كشف تسجيل حضور المحاضرات الذكي — جامعة بابل
        </h2>
        <p style="text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 15px;">
          تاريخ الاستخراج: ${new Date().toLocaleString('ar-IQ')} | إجمالي السجلات: ${records.length}
        </p>
        <table border="1">
          <thead>
            <tr>
              <th>Student Code (رمز القيد)</th>
              <th>Group (الشعبة)</th>
              <th>اسم الطالب الكامل</th>
              <th>وقت التسجيل (Timestamp)</th>
              <th>نطاق الحضور الجغرافي (GPS)</th>
              <th>اسم المحاضرة</th>
              <th>فترة المحاضرة</th>
              <th>حالة الحضور</th>
              <th>مدة التأخير</th>
              <th>بصمة الوجه الرقمية</th>
              <th>نوع الدراسة</th>
              <th>المرحلة الدراسية</th>
              <th>الأستاذ المحاضر</th>
              <th>قاعة الانعقاد</th>
              <th>معرف الجهاز (Device ID)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF', excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exact Student Attendance CSV export matching AppSheet / Excel schema:
 * Supports delimiter parameter:
 * - ',' (Standard CSV for AppSheet & Google Sheets)
 * - ';' (Arabic Windows Excel friendly delimiter to prevent single-column crowding)
 */
export const exportAttendanceToCSV = (
  records: StudentAttendanceRecord[], 
  customFilename?: string,
  delimiter: ',' | ';' = ','
): void => {
  const headers = [
    'Student Code',
    'Group',
    'Name',
    'Timestamp',
    'Location',
    'Lecture name',
    'Start Time',
    'End Time',
    'حالة الحضور',
    'مدة التأخير',
    'بصمة الوجه الرقمية',
    'أيام الأسبوع',
    'نوع الدراسة',
    'Email',
    'College',
    'University',
    'Stage',
    'Lecturer name',
    'Teacher Email',
    'lecture place',
  ];

  const rows = records.map((r) => [
    escapeCSVCell(r.studentCode),
    escapeCSVCell(r.group),
    escapeCSVCell(r.name),
    escapeCSVCell(r.timestamp),
    escapeCSVCell(r.location),
    escapeCSVCell(r.lectureName),
    escapeCSVCell(r.startTime),
    escapeCSVCell(r.endTime),
    escapeCSVCell(r.attendanceStatus),
    r.delayMinutes ?? 0,
    escapeCSVCell(r.faceVerified ? 'موثق بالبصمة ✓' : 'اختياري / غير مفعل'),
    escapeCSVCell(r.weekDays),
    escapeCSVCell(r.studyType),
    escapeCSVCell(r.email),
    escapeCSVCell(r.college),
    escapeCSVCell(r.university),
    escapeCSVCell(r.stage),
    escapeCSVCell(r.lecturerName),
    escapeCSVCell(r.teacherEmail),
    escapeCSVCell(r.lecturePlace),
  ]);

  const csv = [
    headers.map(escapeCSVCell).join(delimiter), 
    ...rows.map((row) => row.join(delimiter))
  ].join('\r\n');
  
  const filename = customFilename || `Student_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(filename, csv);
};

/**
 * Exact Lectures Table CSV export matching user requested schema
 */
export const exportLecturesToCSV = (
  lectures: Lecture[],
  customFilename?: string,
  delimiter: ',' | ';' = ','
): void => {
  const headers = [
    'Lecture ID',
    'Lecture name',
    'Start Time',
    'End Time',
    'نوع الدراسة',
    'أيام الأسبوع',
    'Group',
    'College',
    'University',
    'Stage',
    'Lecturer name',
    'Teacher Email',
    'lecture place',
    'بصمة الوجه الرقمية',
  ];

  const rows = lectures.map((l) => [
    escapeCSVCell(l.lectureId),
    escapeCSVCell(l.lectureName),
    escapeCSVCell(l.startTime),
    escapeCSVCell(l.endTime),
    escapeCSVCell(l.studyType),
    escapeCSVCell(l.weekDays),
    escapeCSVCell(l.group),
    escapeCSVCell(l.college),
    escapeCSVCell(l.university),
    escapeCSVCell(l.stage),
    escapeCSVCell(l.lecturerName),
    escapeCSVCell(l.teacherEmail),
    escapeCSVCell(l.lecturePlace),
    escapeCSVCell(l.requireFaceBiometric ? 'مفعلة من الأستاذ' : 'اختيارية / معطلة'),
  ]);

  const csv = [
    headers.map(escapeCSVCell).join(delimiter), 
    ...rows.map((row) => row.join(delimiter))
  ].join('\r\n');

  downloadCSV(customFilename || `Lectures_Schedule_${new Date().toISOString().slice(0, 10)}.csv`, csv);
};

export const downloadAppSheetStarterTemplate = (): void => {
  const headers = [
    'Student Code',
    'Group',
    'Name',
    'Timestamp',
    'Location',
    'Lecture name',
    'Start Time',
    'End Time',
    'حالة الحضور',
    'مدة التأخير',
    'أيام الأسبوع',
    'نوع الدراسة',
    'Email',
    'College',
    'University',
    'Stage',
    'Lecturer name',
    'Teacher Email',
    'lecture place',
  ];

  const sampleRow = [
    'STU-2024-001',
    'Group A',
    'علي حيدر كاظم',
    '2026-10-16 08:32:15',
    'مدرج ابن الهيثم (GPS: 24.7136, 46.6753 - داخل النطاق 12م)',
    'هندسة البرمجيات المتقدمة',
    '08:30',
    '10:30',
    'حاضر',
    0,
    'الأحد، الثلاثاء',
    'صباحي',
    'ali.haider@student.edu',
    'كلية هندسة المعلومات والحاسبات',
    'جامعة التكنولوجيا والعلوم الحديثة',
    'المرحلة الثالثة',
    'أ.د. أحمد كمال حسن',
    'dr.ahmed@university.edu',
    'مدرج ابن الهيثم (قاعة 101)',
  ];

  const csv = [headers.map(escapeCSVCell).join(','), sampleRow.map(escapeCSVCell).join(',')].join('\r\n');
  downloadCSV('AppSheet_Attendance_Template.csv', csv);
};

export const parseStudentsCSV = (csvText: string): any[] => {
  const clean = csvText.replace(/^\uFEFF/, '').replace(/^sep=[,\t;]\r?\n/i, '').trim();
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const list: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Detect delimiter (comma or semicolon)
    const delimiter = lines[i].includes(';') ? ';' : ',';
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length >= 3) {
      list.push({
        id: `USR-${i}`,
        studentCode: cols[0] || `STU-${i}`,
        name: cols[2] || cols[1] || `طالب ${i}`,
        email: cols[12] || `student${i}@university.edu`,
        role: 'student' as const,
        group: cols[1] || 'Group A',
        college: cols[13] || 'كلية التمريض',
        university: cols[14] || 'جامعة بابل',
        stage: cols[15] || 'المرحلة الثانية',
      });
    }
  }
  return list;
};

/**
 * Exports a dedicated independent Excel sheet for a single lecture
 * Filename format: حضور_[اسم المحاضرة]_[المرحلة]_[Group]_[التاريخ].xlsx
 * Columns: Student Code | اسم الطالب | Stage | Group Name | Timestamp | حالة الحضور | مدة التأخير | Location | Lecturer name | lecture place
 */
export const exportSingleLectureExcel = (lecture: Lecture, allRecords: StudentAttendanceRecord[]): void => {
  const lectureRecords = allRecords.filter(r => 
    r.lectureName === lecture.lectureName &&
    (!lecture.stage || !r.stage || r.stage === lecture.stage) &&
    (!lecture.group || !r.group || r.group === lecture.group)
  );

  const safeName = (lecture.lectureName || 'محاضرة').replace(/[\/\\?%*:|"<>]/g, '_');
  const safeStage = (lecture.stage || 'المرحلة').replace(/[\/\\?%*:|"<>]/g, '_');
  const safeGroup = (lecture.group || 'Group').replace(/[\/\\?%*:|"<>]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `حضور_${safeName}_${safeStage}_${safeGroup}_${dateStr}.xlsx`;

  const rowsHtml = lectureRecords.map((r, idx) => {
    const statusBg = r.attendanceStatus === 'حاضر' ? '#dcfce7; color: #166534' : r.attendanceStatus === 'متأخر' ? '#fef3c7; color: #92400e' : '#fee2e2; color: #991b1b';
    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="font-family: Arial, sans-serif; mso-number-format:'\\@'; font-weight: bold; text-align: center; color: #1d4ed8; border: 1px solid #cbd5e1; padding: 8px;">${r.studentCode || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.name || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.stage || lecture.stage || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.group || lecture.group || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px; direction: ltr;">${r.timestamp || ''}</td>
        <td style="font-family: Arial, sans-serif; font-weight: bold; text-align: center; background-color: ${statusBg}; border: 1px solid #cbd5e1; padding: 8px;">${r.attendanceStatus || ''}</td>
        <td style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${r.delayMinutes > 0 ? `${r.delayMinutes} دقيقة` : 'لا يوجد'}</td>
        <td style="font-family: Arial, sans-serif; border: 1px solid #cbd5e1; padding: 8px;">${r.location || ''}</td>
        <td style="font-family: Arial, sans-serif; border: 1px solid #cbd5e1; padding: 8px;">${r.lecturerName || lecture.lecturerName || ''}</td>
        <td style="font-family: Arial, sans-serif; border: 1px solid #cbd5e1; padding: 8px;">${r.lecturePlace || lecture.lecturePlace || ''}</td>
      </tr>
    `;
  }).join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${safeName.slice(0, 31)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                  <x:Selected/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th { background-color: #0f172a; color: #ffffff; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; font-weight: bold; border: 1px solid #334155; padding: 10px; }
          td { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; }
        </style>
      </head>
      <body dir="rtl">
        <h2 style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; text-align: center; color: #0f172a; margin-bottom: 5px;">
          كشف حضور محاضرة: ${lecture.lectureName} (${lecture.stage} - ${lecture.group})
        </h2>
        <p style="text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 15px;">
          القاعة: ${lecture.lecturePlace} | الأستاذ: ${lecture.lecturerName} | التوقيت: ${lecture.startTime} - ${lecture.endTime} | إجمالي الحضور: ${lectureRecords.length}
        </p>
        <table border="1">
          <thead>
            <tr>
              <th>Student Code</th>
              <th>اسم الطالب</th>
              <th>Stage</th>
              <th>Group Name</th>
              <th>Timestamp</th>
              <th>حالة الحضور</th>
              <th>مدة التأخير</th>
              <th>Location</th>
              <th>Lecturer name</th>
              <th>lecture place</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF', excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports a structured, professional PDF report for a single lecture
 * Includes Babylon University header, lecture metadata, attendee table, and official signature sections
 */
export const exportSingleLecturePDF = (lecture: Lecture, allRecords: StudentAttendanceRecord[]): void => {
  const lectureRecords = allRecords.filter(r => 
    r.lectureName === lecture.lectureName &&
    (!lecture.stage || !r.stage || r.stage === lecture.stage) &&
    (!lecture.group || !r.group || r.group === lecture.group)
  );

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة (Popups) لتصدير تقرير الـ PDF');
    return;
  }

  const rowsHtml = lectureRecords.map((r, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #1d4ed8; font-family: monospace;">${r.studentCode || ''}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${r.name || ''}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${r.stage || lecture.stage || ''}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${r.group || lecture.group || ''}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; direction: ltr; font-family: monospace;">${r.timestamp || ''}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: ${r.attendanceStatus === 'حاضر' ? '#166534' : r.attendanceStatus === 'متأخر' ? '#92400e' : '#991b1b'};">${r.attendanceStatus || ''}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${r.delayMinutes > 0 ? `${r.delayMinutes}د` : '-'}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; font-size: 10px; color: #475569;">${r.location || ''}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير حضور محاضرة - ${lecture.lectureName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 25px; color: #0f172a; direction: rtl; background: #ffffff; }
          .header { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { font-size: 13px; font-weight: bold; color: #334155; margin: 0 0 4px 0; }
          .header h1 { font-size: 17px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; }
          .header p { font-size: 11px; color: #64748b; margin: 0; }
          .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #0f172a; color: #ffffff; padding: 8px; font-size: 11px; font-weight: bold; border: 1px solid #334155; text-align: center; }
          td { font-size: 11px; color: #1e293b; }
          .footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; font-weight: bold; page-break-inside: avoid; }
          .print-btn-container { text-align: center; margin-top: 30px; }
          .print-btn { background: #0f172a; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .print-btn:hover { background: #1e293b; }
          @media print {
            body { margin: 10px; }
            .print-btn-container { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>جمهورية العراق · وزارة التعليم العالي والبحث العلمي</h2>
          <h1>جامعة بابل · كلية التمريض</h1>
          <p>نظام إدارة وتوثيق حضور المحاضرات الذكي (توقيت بابل - العراق · Asia/Baghdad)</p>
        </div>

        <div style="text-align: center; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 16px; color: #1d4ed8; font-weight: 800;">تقرير كشف حضور وغياب الطلاب الرسمي للمحاضرة</h2>
        </div>

        <div class="meta-box">
          <div><strong>اسم المحاضرة:</strong> ${lecture.lectureName}</div>
          <div><strong>القاعة / المكان:</strong> ${lecture.lecturePlace}</div>
          <div><strong>الأستاذ المحاضر:</strong> ${lecture.lecturerName} (${lecture.teacherEmail})</div>
          <div><strong>المرحلة والشعبة:</strong> ${lecture.stage} - ${lecture.group}</div>
          <div><strong>توقيت المحاضرة:</strong> ${lecture.startTime} إلى ${lecture.endTime} (${lecture.studyType})</div>
          <div><strong>تاريخ الإصدار:</strong> ${new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })} | الإجمالي: ${lectureRecords.length} طالب</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student Code</th>
              <th>اسم الطالب الكامل</th>
              <th>Stage</th>
              <th>Group</th>
              <th>Timestamp</th>
              <th>الحالة</th>
              <th>التأخير</th>
              <th>نطاق التواجد الجغرافي (GPS)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">لا توجد سجلات حضور مسجلة لهذا الكشف بعد.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <p>توقيع الأستاذ المحاضر:</p>
            <br/><br/>
            <p>........................................</p>
          </div>
          <div>
            <p>توقيع رئاسة القسم / الشعبة:</p>
            <br/><br/>
            <p>........................................</p>
          </div>
        </div>

        <div class="print-btn-container">
          <button class="print-btn" onclick="window.print();">
            🖨️ طباعة أو حفظ التقرير كملف (PDF)
          </button>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
};


