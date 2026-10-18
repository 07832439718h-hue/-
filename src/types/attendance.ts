export type UserRole = 'admin' | 'lecturer' | 'student';
export type AttendanceStatus = 'حاضر' | 'متأخر' | 'غائب' | 'معذور';
export type StudyType = 'صباحي' | 'مسائي' | 'مدمج';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  studentCode?: string; // If role === 'student'
  college: string;
  university: string;
  stage?: string;
  group?: string;
  studyType?: StudyType;
  registeredDeviceId?: string; // Device fingerprint binding
  isSuperAdmin?: boolean; // Primary / Original Admin who has unrestricted root authority
  adminPermissions?: string[]; // Specific granular permissions if Sub-Admin
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  placeName: string;
}

/**
 * Exact Student Attendance Record as specified by user:
 * Student Code | Group | Name | Timestamp | Location | Lecture name | Start Time | End Time |
 * حالة الحضور | مدة التأخير | أيام الأسبوع | نوع الدراسة | Email | College | University | Stage |
 * Lecturer name | Teacher Email | lecture place
 */
export interface StudentAttendanceRecord {
  id: string; // Internal unique ID
  studentCode: string;
  group: string;
  name: string;
  timestamp: string; // ISO / Formatted Time
  location: string; // e.g. "مدرج أ (GPS: 24.7136, 46.6753 - داخل النطاق 12م)"
  lectureName: string;
  startTime: string; // e.g. "08:30"
  endTime: string; // e.g. "10:30"
  attendanceStatus: AttendanceStatus; // حالة الحضور
  delayMinutes: number; // مدة التأخير بالدقائق
  weekDays: string; // أيام الأسبوع, e.g. "الأحد، الثلاثاء"
  studyType: StudyType; // نوع الدراسة: صباحي / مسائي
  email: string; // إيميل الطالب
  college: string; // College
  university: string; // University
  stage: string; // Stage (المرحلة الأولى، الثانية...)
  lecturerName: string; // Lecturer name
  teacherEmail: string; // Teacher Email
  lecturePlace: string; // lecture place
  deviceId?: string; // Device verification fingerprint
  excuseNote?: string;
  faceVerified?: boolean; // Verified by Biometric Face Scan
}

/**
 * Exact Lecture Schema as specified by user:
 * Lecture ID | Lecture name | Start Time | End Time | نوع الدراسة | أيام الأسبوع | Group |
 * College | University | Stage | Lecturer name | Teacher Email | lecture place
 */
export interface Lecture {
  lectureId: string;
  lectureName: string;
  startTime: string; // "08:30"
  endTime: string; // "10:30"
  studyType: StudyType; // نوع الدراسة
  weekDays: string; // أيام الأسبوع
  group: string; // Group
  college: string; // College
  university: string; // University
  stage: string; // Stage
  lecturerName: string; // Lecturer name
  teacherEmail: string; // Teacher Email
  lecturePlace: string; // lecture place
  
  // Geolocation & Security constraints set by Lecturer / Admin
  targetLatitude: number;
  targetLongitude: number;
  allowedRadiusMeters: number; // e.g. 100 meters
  activeOtpCode?: string; // Dynamic OTP/QR code (e.g. "749201")
  isSessionActive: boolean; // Lecturer opened attendance session
  requireFaceBiometric?: boolean; // Lecturer toggle for Face ID biometric scan
  requireLocationVerification?: boolean; // Lecturer toggle for whether student location verification is required
  attendanceWindowMinutes?: number; // Attendance registration time lock (e.g. 15 mins)
}

export interface ExcuseRequest {
  id: string;
  studentCode: string;
  studentName: string;
  studentEmail: string;
  lectureName: string;
  lectureId: string;
  reason: string;
  attachmentUrl?: string; // Image or PDF data URL
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
  lecturerEmail: string;
}

export interface UniversitySettings {
  university: string;
  college: string;
  defaultAllowedRadiusMeters: number;
  requireDeviceVerification: boolean;
  requireLocationVerification: boolean;
  requireDynamicOtp: boolean;
  googleSheetsWebhookUrl?: string;
  autoSyncToGoogleSheets?: boolean;
}
