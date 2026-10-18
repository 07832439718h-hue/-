import { StudentAttendanceRecord } from '../types/attendance';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * كود Google Apps Script للربط المباشر مع تطبيق حضور كلية التمريض - جامعة بابل
 * يوضع في: Google Sheets -> Extensions (التوسيعات) -> Apps Script
 * ثم يُنشر كـ: Deploy -> New Deployment -> Web app (Who has access: Anyone)
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Attendance") || ss.getActiveSheet();
    
    // فحص ما إذا كان الشيت يحتوي على العناوين، وإن لم تكن موجودة يتم إنشاؤها
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Student Code",
        "Group",
        "Name",
        "Timestamp",
        "Location",
        "Lecture name",
        "Start Time",
        "End Time",
        "حالة الحضور",
        "مدة التأخير",
        "أيام الأسبوع",
        "نوع الدراسة",
        "Email",
        "College",
        "University",
        "Stage",
        "Lecturer name",
        "Teacher Email",
        "lecture place"
      ]);
      // تنسيق سطر العناوين
      sheet.getRange(1, 1, 1, 19).setFontWeight("bold").setBackground("#1e3a8a").setFontColor("#ffffff");
    }

    var data = JSON.parse(e.postData.contents);

    // إضافة سطر الحضور الجديد المتطابق تماماً مع بيانات الطالب والمحاضرة
    sheet.appendRow([
      data.studentCode || "",
      data.group || "",
      data.name || "",
      data.timestamp || new Date().toLocaleString("ar-IQ"),
      data.location || "",
      data.lectureName || "",
      data.startTime || "",
      data.endTime || "",
      data.attendanceStatus || "حاضر",
      data.delayMinutes || 0,
      data.weekDays || "",
      data.studyType || "صباحي",
      data.email || "",
      data.college || "كلية التمريض",
      data.university || "جامعة بابل",
      data.stage || "المرحلة الثانية",
      data.lecturerName || "",
      data.teacherEmail || "",
      data.lecturePlace || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "تم حفظ الحضور بنجاح في Google Sheets"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "alive",
    university: "جامعة بابل - كلية التمريض",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Sends attendance record directly to Google Sheets Webhook (Apps Script)
 */
export async function sendAttendanceToGoogleSheets(
  webhookUrl: string,
  record: StudentAttendanceRecord
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, message: 'عنوان Webhook غير صالح أو غير معرّف' };
  }

  try {
    // Mode no-cors is commonly used for Google Apps Script redirects without preflight CORS failures
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(record),
      mode: 'no-cors',
    });

    return {
      success: true,
      message: 'تم إرسال سجل الحضور بنجاح إلى جدول Google Sheets السحابي!',
    };
  } catch (error: any) {
    console.error('Error syncing to Google Sheets:', error);
    return {
      success: false,
      message: error.message || 'تعذر الاتصال بـ Google Apps Script',
    };
  }
}
