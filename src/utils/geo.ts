import { Lecture, StudentAttendanceRecord } from '../types/attendance';

/**
 * Geolocation & Device Security Verification Utilities
 */

// Haversine formula to calculate distance between two coordinates in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Generate a deterministic client device fingerprint
export function getOrCreateDeviceId(): string {
  const KEY = 'appsheet_university_device_fingerprint';
  let deviceId = localStorage.getItem(KEY);
  if (!deviceId) {
    const raw = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}-${Math.random().toString(36).slice(2, 10)}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    deviceId = `DEV-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
    localStorage.setItem(KEY, deviceId);
  }
  return deviceId;
}

// Calculate delay minutes compared to lecture start time
export function calculateDelayMinutes(startTimeStr: string): number {
  try {
    const now = new Date();
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    const lectureStart = new Date(now);
    lectureStart.setHours(startHour, startMin, 0, 0);

    const diffMs = now.getTime() - lectureStart.getTime();
    if (diffMs <= 0) {
      return 0; // On time / early
    }
    return Math.floor(diffMs / 60000);
  } catch {
    return 0;
  }
}

// Format date and time in Arabic
export function formatArabicDateTime(date: Date = new Date()): string {
  const d = date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const t = date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${d} ${t}`;
}

// Default University Hall Coordinates (جامعة بابل - كلية التمريض)
export const DEFAULT_CAMPUS_COORDS = {
  latitude: 32.274176,
  longitude: 44.805896,
  placeName: 'جامعة بابل - كلية التمريض (القاعات والمختبرات)',
};

export const calculateStudentAbsence = (
  studentEmail: string,
  studentCode: string,
  lectures: Lecture[],
  attendanceRecords: StudentAttendanceRecord[]
) => {
  let totalHours = 0;
  lectures.forEach(l => {
    try {
      const [startH, startM] = l.startTime.split(':').map(Number);
      const [endH, endM] = (l.endTime || '10:30').split(':').map(Number);
      const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
      totalHours += durationHours > 0 ? durationHours : 2;
    } catch {
      totalHours += 2;
    }
  });
  if (totalHours === 0) totalHours = lectures.length * 2 || 10;

  const studentRecords = attendanceRecords.filter(r => 
    (studentEmail && r.email && r.email.toLowerCase() === studentEmail.toLowerCase()) || 
    (studentCode && r.studentCode && r.studentCode === studentCode)
  );

  let attendedHours = 0;
  studentRecords.forEach(r => {
    if (r.attendanceStatus === 'حاضر' || r.attendanceStatus === 'متأخر') {
      const matchLec = lectures.find(l => l.lectureName === r.lectureName);
      let lecHours = 2;
      if (matchLec) {
        try {
          const [sh, sm] = matchLec.startTime.split(':').map(Number);
          const [eh, em] = (matchLec.endTime || '10:30').split(':').map(Number);
          lecHours = Math.max(1, (eh * 60 + em - (sh * 60 + sm)) / 60);
        } catch {
          lecHours = 2;
        }
      }
      attendedHours += lecHours;
    }
  });

  const absentHours = Math.max(0, totalHours - attendedHours);
  const absencePercentage = Math.round((absentHours / totalHours) * 100);
  const isExceeded = absencePercentage > 10;

  return { absentHours, totalHours, absencePercentage, isExceeded };
};

/**
 * Safely parse a time string like "08:30" or "08:30:00" into total minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Normalizes Arabic day names to match with or without alef hamzas
 */
export function normalizeArabicDay(dayStr: string): string {
  if (!dayStr) return '';
  return dayStr.replace(/[\u0625\u0623\u0622]/g, 'ا').trim();
}

/**
 * Checks if a student's group matches the lecture's group specification
 * Supports 'A', 'B', 'A+B', 'C+D', 'كل الشعب', 'All'
 */
export function matchStudentGroup(lectureGroup?: string, studentGroup?: string): boolean {
  if (!lectureGroup || !studentGroup) return true;
  const lg = lectureGroup.trim();
  const sg = studentGroup.trim();
  if (lg === 'كل الشعب' || lg === 'All' || lg === 'عام' || lg === 'جميع الشعب') return true;
  if (lg.toLowerCase() === sg.toLowerCase()) return true;
  const tokens = lg.split(/[+,\s/]+/);
  return tokens.some((t) => t.toLowerCase() === sg.toLowerCase());
}

/**
 * Checks if a student's stage matches the lecture's stage
 */
export function matchStudentStage(lectureStage?: string, studentStage?: string): boolean {
  if (!lectureStage || !studentStage) return true;
  return lectureStage.trim().toLowerCase() === studentStage.trim().toLowerCase();
}

/**
 * Smart automatic lecture selector based on:
 * 1. Active session by lecturer (top priority)
 * 2. Current day and current real-time window
 * 3. Upcoming lecture today
 * 4. Fallback to first available matching lecture
 */
export interface LectureSelectionCriteria {
  lectureId?: string;
  lectureName?: string;
  startTime?: string;
  endTime?: string;
  studyType?: string;
  weekDays?: string;
  group?: string;
  college?: string;
  university?: string;
  stage?: string;
  lecturerName?: string;
  teacherEmail?: string;
  lecturePlace?: string;
  studentGroup?: string;
  studentStage?: string;
  studentStudyType?: string;
  studentCollege?: string;
  studentUniversity?: string;
  targetLectureId?: string;
  searchQuery?: string;
  now?: Date;
}

/**
 * Format a lecture with all 13 official AppSheet columns
 */
export function formatLecture13Fields(l: Lecture): string {
  return `[${l.lectureId}] ${l.lectureName} | ${l.startTime.slice(0, 5)} - ${l.endTime.slice(0, 5)} | ${l.studyType} | ${l.weekDays} | شعبة ${l.group} | ${l.college} | ${l.university} | ${l.stage} | أ. ${l.lecturerName} (${l.teacherEmail}) | ${l.lecturePlace}`;
}

/**
 * Smart automatic lecture selector based on all 13 columns:
 * 1. Active session by lecturer (top priority)
 * 2. Current day and current real-time window
 * 3. Exact matching on University, College, Stage, Group, StudyType, Days, Room, Lecturer
 * 4. Fallback to closest match
 */
export function autoSelectLecture(
  availableLectures: Lecture[],
  options?: LectureSelectionCriteria
): {
  bestLecture: Lecture | null;
  reason: 'active_session' | 'current_time' | 'upcoming_today' | 'criteria_match' | 'fallback' | 'none';
  reasonText: string;
} {
  if (!availableLectures || availableLectures.length === 0) {
    return { bestLecture: null, reason: 'none', reasonText: 'لا توجد محاضرات متاحة' };
  }

  const now = options?.now || new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayRaw = dayNamesAr[now.getDay()];
  const todayNorm = normalizeArabicDay(todayRaw);

  const groupFilter = options?.group || options?.studentGroup;
  const stageFilter = options?.stage || options?.studentStage;
  const studyTypeFilter = options?.studyType || options?.studentStudyType;
  const collegeFilter = options?.college || options?.studentCollege;
  const universityFilter = options?.university || options?.studentUniversity;
  const targetId = options?.targetLectureId || options?.lectureId;

  // 1. Filter matching lectures based on all 13 criteria:
  let candidateLectures = availableLectures.filter((l) => {
    // 1. Lecture ID
    if (targetId && l.lectureId.toLowerCase().trim() !== targetId.toLowerCase().trim()) return false;
    // 2. Lecture Name
    if (options?.lectureName && !l.lectureName.toLowerCase().includes(options.lectureName.toLowerCase().trim())) return false;
    // 3. Start Time
    if (options?.startTime && !l.startTime.startsWith(options.startTime.slice(0, 5))) return false;
    // 4. End Time
    if (options?.endTime && !l.endTime.startsWith(options.endTime.slice(0, 5))) return false;
    // 5. نوع الدراسة (Study Type)
    if (studyTypeFilter && l.studyType && studyTypeFilter.trim() !== l.studyType.trim()) return false;
    // 6. أيام الأسبوع (Week Days)
    if (options?.weekDays) {
      const wNorm = normalizeArabicDay(l.weekDays || '');
      const targetWNorm = normalizeArabicDay(options.weekDays);
      if (!wNorm.includes(targetWNorm)) return false;
    }
    // 7. Group
    if (groupFilter && !matchStudentGroup(l.group, groupFilter)) return false;
    // 8. College
    if (collegeFilter && l.college && collegeFilter.trim() !== l.college.trim()) return false;
    // 9. University
    if (universityFilter && l.university && universityFilter.trim() !== l.university.trim()) return false;
    // 10. Stage
    if (stageFilter && !matchStudentStage(l.stage, stageFilter)) return false;
    // 11. Lecturer name
    if (options?.lecturerName && !l.lecturerName.toLowerCase().includes(options.lecturerName.toLowerCase().trim())) return false;
    // 12. Teacher Email
    if (options?.teacherEmail && l.teacherEmail?.toLowerCase().trim() !== options.teacherEmail.toLowerCase().trim()) return false;
    // 13. lecture place
    if (options?.lecturePlace && !l.lecturePlace.toLowerCase().includes(options.lecturePlace.toLowerCase().trim())) return false;

    // Optional free-text search across all 13 columns
    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase().trim();
      const combined = `${l.lectureId} ${l.lectureName} ${l.startTime} ${l.endTime} ${l.studyType} ${l.weekDays} ${l.group} ${l.college} ${l.university} ${l.stage} ${l.lecturerName} ${l.teacherEmail} ${l.lecturePlace}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }

    return true;
  });

  if (candidateLectures.length === 0) {
    candidateLectures = availableLectures;
  }

  // 2. Priority 1: Lecture with active attendance session opened by lecturer!
  const activeSessionLec = candidateLectures.find((l) => l.isSessionActive);
  if (activeSessionLec) {
    return {
      bestLecture: activeSessionLec,
      reason: 'active_session',
      reasonText: `جلسة حضور نشطة ومفتوحة الآن من قبل الأستاذ (${activeSessionLec.lecturerName}) - قاعة: ${activeSessionLec.lecturePlace}`,
    };
  }

  // 3. Priority 2: Lecture matching Today + Current real-time window
  const liveLec = candidateLectures.find((l) => {
    const lDayNorm = normalizeArabicDay(l.weekDays || '');
    const matchDay = !l.weekDays || lDayNorm.includes(todayNorm) || lDayNorm.includes('يوميا') || lDayNorm.includes('كل الايام');
    if (!matchDay) return false;

    const startMin = parseTimeToMinutes(l.startTime);
    const endMin = parseTimeToMinutes(l.endTime) || startMin + 120;

    // Window: 15 minutes before start to 30 minutes after end
    return currentMinutes >= startMin - 15 && currentMinutes <= endMin + 30;
  });

  if (liveLec) {
    return {
      bestLecture: liveLec,
      reason: 'current_time',
      reasonText: `المحاضرة جارية الآن وفقاً للوقت الفعلي والجدول (${liveLec.startTime.slice(0, 5)} - ${liveLec.endTime.slice(0, 5)}) في ${liveLec.lecturePlace}`,
    };
  }

  // 4. Priority 3: Upcoming lecture today
  const todayUpcomingLecs = candidateLectures.filter((l) => {
    const lDayNorm = normalizeArabicDay(l.weekDays || '');
    const matchDay = !l.weekDays || lDayNorm.includes(todayNorm) || lDayNorm.includes('يوميا');
    if (!matchDay) return false;
    const startMin = parseTimeToMinutes(l.startTime);
    return startMin > currentMinutes;
  }).sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  if (todayUpcomingLecs.length > 0) {
    const upcoming = todayUpcomingLecs[0];
    const minsLeft = parseTimeToMinutes(upcoming.startTime) - currentMinutes;
    return {
      bestLecture: upcoming,
      reason: 'upcoming_today',
      reasonText: `المحاضرة القادمة اليوم (تبدأ بعد ${minsLeft} دقيقة في ${upcoming.startTime.slice(0, 5)}) - ${upcoming.lecturePlace}`,
    };
  }

  // 5. Priority 4: Any lecture matching today
  const todayAnyLec = candidateLectures.find((l) => {
    const lDayNorm = normalizeArabicDay(l.weekDays || '');
    return !l.weekDays || lDayNorm.includes(todayNorm) || lDayNorm.includes('يوميا');
  });

  if (todayAnyLec) {
    return {
      bestLecture: todayAnyLec,
      reason: 'fallback',
      reasonText: `محاضرة مجدولة لليوم (${todayAnyLec.weekDays}) - قاعة: ${todayAnyLec.lecturePlace}`,
    };
  }

  // 6. Fallback
  return {
    bestLecture: candidateLectures[0] || null,
    reason: 'fallback',
    reasonText: `أول محاضرة مطابقة في الجدول الدراسي (${candidateLectures[0]?.lectureId})`,
  };
}

/**
 * مدخلات دالة فلترة المحاضرات المتاحة حالياً
 */
export interface AvailableLecturesFilterParams {
  lectures: Lecture[];
  studentGroup?: string;
  studentStage?: string;
  studentStudyType?: string;
  studentCollege?: string;
  studentUniversity?: string;
  now?: Date;
}

/**
 * مخرجات دالة فلترة المحاضرات المتاحة حالياً
 */
export interface AvailableLecturesFilterResult {
  // جميع محاضرات الطالب بحسب مرحلته وشعبته
  studentLectures: Lecture[];
  // المحاضرات المتاحة حالياً وفق التوقيت الفعلي والتاريخ
  currentlyAvailableLectures: Lecture[];
  // المحاضرة الملقّنة تلقائياً في الحقل
  assignedLecture: Lecture | null;
  // هل التحديد ناتج مباشرة عن اختيار الأستاذ (جلسة نشطة مفتوحة)؟
  isProfessorDirectSelection: boolean;
  // نص توضيحي لسبب التحديد باللغة العربية
  reasonText: string;
  // نوع حالة المحاضرة
  statusType: 'professor_active' | 'realtime_active' | 'upcoming_today' | 'fallback_schedule' | 'none';
  // حالة تجميد الحقل (Read-Only) دائماً true لواجهة الطالب لحفظ النزاهة وعدم تجاوز الأستاذ
  isReadOnly: boolean;
  // نص الشارة المعروضة على الحقل المجمد
  readOnlyBadgeText: string;
}

/**
 * دالة util تقوم بفلترة المحاضرات المتاحة حالياً بناءً على الوقت الفعلي والتاريخ وخصائص الطالب (المجموعة والمرحلة)
 * مع ضمان تلقين الحقل وتجميده (Read-Only) دون تجاوز اختيار الأستاذ
 */
export function filterCurrentlyAvailableLectures(
  params: AvailableLecturesFilterParams
): AvailableLecturesFilterResult {
  const {
    lectures = [],
    studentGroup,
    studentStage,
    studentStudyType,
    studentCollege,
    now = new Date(),
  } = params;

  if (!lectures || lectures.length === 0) {
    return {
      studentLectures: [],
      currentlyAvailableLectures: [],
      assignedLecture: null,
      isProfessorDirectSelection: false,
      reasonText: 'لا توجد محاضرات في جدول الجامعة حالياً',
      statusType: 'none',
      isReadOnly: true,
      readOnlyBadgeText: 'مجمّد (لا توجد محاضرات)',
    };
  }

  // 1. فلترة المحاضرات الخاصة بالطالب استناداً للمرحلة والشعبة (Group & Stage)
  const studentLectures = lectures.filter((l) => {
    const matchGrp = matchStudentGroup(l.group, studentGroup);
    const matchStg = matchStudentStage(l.stage, studentStage);
    const matchStudy = !studentStudyType || !l.studyType || l.studyType === studentStudyType;
    const matchCol = !studentCollege || !l.college || l.college === studentCollege;
    return matchGrp && matchStg && matchStudy && matchCol;
  });

  const baseLectures = studentLectures.length > 0 ? studentLectures : lectures;

  // 2. التحقق من أولوية اختيار الأستاذ (دون تجاوز اختيار الاستاذ):
  // إذا قام الأستاذ بتفعيل جلسة حضور نشطة لمحاضرته، يتم اعتمادها فوراً وتجميدها ولا يمكن للطالب تجاوزها
  let professorActiveLecture = baseLectures.find((l) => l.isSessionActive);
  
  // إذا لم نجدها في قاعدة محاضرات الطالب، نبحث في كل المحاضرات عن جلسة نشطة تطابق شعبة أو مرحلة الطالب
  if (!professorActiveLecture) {
    professorActiveLecture = lectures.find(
      (l) => l.isSessionActive && matchStudentGroup(l.group, studentGroup) && matchStudentStage(l.stage, studentStage)
    );
  }

  if (professorActiveLecture) {
    return {
      studentLectures: baseLectures,
      currentlyAvailableLectures: [professorActiveLecture],
      assignedLecture: professorActiveLecture,
      isProfessorDirectSelection: true,
      reasonText: `تم اعتماد وتلقين المحاضرة مباشرة من اختيار الأستاذ (${professorActiveLecture.lecturerName}) - قاعة: ${professorActiveLecture.lecturePlace}`,
      statusType: 'professor_active',
      isReadOnly: true,
      readOnlyBadgeText: 'معتمدة من الأستاذ (Read-Only) 🔒',
    };
  }

  // 3. الفلترة بالوقت الفعلي والتاريخ الحالي (Real-Time & Date):
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayRaw = dayNamesAr[now.getDay()];
  const todayNorm = normalizeArabicDay(todayRaw);

  // مطابقة اليوم في جدول الأسبوع
  const todayLectures = baseLectures.filter((l) => {
    const lDayNorm = normalizeArabicDay(l.weekDays || '');
    return !l.weekDays || lDayNorm.includes(todayNorm) || lDayNorm.includes('يوميا') || lDayNorm.includes('كل الايام');
  });

  // فحص المحاضرات الجارية حالياً في الوقت الفعلي (من 15 دقيقة قبل البداية وحتى 30 دقيقة بعد النهاية)
  const currentlyLiveLectures = todayLectures.filter((l) => {
    const startMin = parseTimeToMinutes(l.startTime);
    const endMin = parseTimeToMinutes(l.endTime) || startMin + 120;
    return currentMinutes >= startMin - 15 && currentMinutes <= endMin + 30;
  });

  if (currentlyLiveLectures.length > 0) {
    const currentLec = currentlyLiveLectures[0];
    return {
      studentLectures: baseLectures,
      currentlyAvailableLectures: currentlyLiveLectures,
      assignedLecture: currentLec,
      isProfessorDirectSelection: false,
      reasonText: `المحاضرة جارية الآن وفقاً للوقت الفعلي واليوم (${currentLec.startTime.slice(0, 5)} - ${currentLec.endTime.slice(0, 5)}) في ${currentLec.lecturePlace}`,
      statusType: 'realtime_active',
      isReadOnly: true,
      readOnlyBadgeText: 'محددة تلقائياً بالوقت الفعلي (Read-Only) 🔒',
    };
  }

  // 4. فحص المحاضرات القادمة اليوم (Upcoming today)
  const upcomingToday = todayLectures
    .filter((l) => parseTimeToMinutes(l.startTime) > currentMinutes)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  if (upcomingToday.length > 0) {
    const nextLec = upcomingToday[0];
    const minsLeft = parseTimeToMinutes(nextLec.startTime) - currentMinutes;
    return {
      studentLectures: baseLectures,
      currentlyAvailableLectures: upcomingToday,
      assignedLecture: nextLec,
      isProfessorDirectSelection: false,
      reasonText: `المحاضرة القادمة اليوم (تبدأ بعد ${minsLeft} دقيقة في ${nextLec.startTime.slice(0, 5)}) - قاعة: ${nextLec.lecturePlace}`,
      statusType: 'upcoming_today',
      isReadOnly: true,
      readOnlyBadgeText: 'المحاضرة القادمة اليوم (Read-Only) 🔒',
    };
  }

  // 5. في حال عدم وجود محاضرة حالية، اعتماد أقرب محاضرة مجدولة لشعبة ومرحلة الطالب
  const fallbackLec = todayLectures[0] || baseLectures[0] || null;
  return {
    studentLectures: baseLectures,
    currentlyAvailableLectures: todayLectures.length > 0 ? todayLectures : baseLectures,
    assignedLecture: fallbackLec,
    isProfessorDirectSelection: false,
    reasonText: fallbackLec
      ? `المحاضرة المجدولة لشعبتك ومرحلتك (${fallbackLec.lectureName} - ${fallbackLec.weekDays})`
      : 'لا توجد محاضرات مطابقة لبيانات الطالب',
    statusType: 'fallback_schedule',
    isReadOnly: true,
    readOnlyBadgeText: 'مجدولة رسمياً (Read-Only) 🔒',
  };
}



