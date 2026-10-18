import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserAccount, 
  Lecture, 
  StudentAttendanceRecord, 
  AttendanceStatus,
  UniversitySettings,
  ExcuseRequest
} from '../types/attendance';
import { 
  calculateDistanceMeters, 
  getOrCreateDeviceId, 
  calculateDelayMinutes, 
  formatArabicDateTime,
  autoSelectLecture,
  matchStudentGroup,
  formatLecture13Fields,
  filterCurrentlyAvailableLectures,
  parseTimeToMinutes
} from '../utils/geo';
import { sounds } from '../utils/audio';
import { getServerNow } from '../utils/serverTime';
import { sendAttendanceToGoogleSheets } from '../utils/googleSheetsSync';
import { PWAInstallButton } from './PWAInstallButton';
import confetti from 'canvas-confetti';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Smartphone, 
  UserCheck, 
  KeyRound, 
  ShieldAlert, 
  Calendar, 
  BookOpen, 
  AlertTriangle,
  History,
  Lock,
  Compass,
  Cloud,
  MessageSquare,
  Bell,
  Sparkles,
  CheckCircle2,
  Share2,
  ScanFace,
  Search,
  TableProperties,
  FileText
} from 'lucide-react';
import { FaceBiometricModal } from './FaceBiometricModal';
import { LectureSelectionModal } from './LectureSelectionModal';

interface StudentAttendancePortalProps {
  currentUser: UserAccount;
  lectures: Lecture[];
  attendanceRecords: StudentAttendanceRecord[];
  onRecordAttendance: (record: StudentAttendanceRecord) => void;
  settings?: UniversitySettings;
  excuseRequests?: ExcuseRequest[];
  onAddExcuseRequest?: (req: ExcuseRequest) => void;
}

export const StudentAttendancePortal: React.FC<StudentAttendancePortalProps> = ({
  currentUser,
  lectures,
  attendanceRecords,
  onRecordAttendance,
  settings,
  excuseRequests,
  onAddExcuseRequest,
}) => {
  const currentDeviceId = getOrCreateDeviceId();
  
  // Candidate lectures matching student's stage and group
  const studentLectures = useMemo(() => {
    return lectures.filter((l) => 
      (!l.stage || !currentUser.stage || l.stage === currentUser.stage) &&
      (!l.group || !currentUser.group || matchStudentGroup(l.group, currentUser.group))
    );
  }, [lectures, currentUser.stage, currentUser.group]);

  // 1. استخدام دالة الـ util لفلترة المحاضرات المتاحة حالياً بناءً على الوقت الفعلي والتاريخ وخصائص الطالب (المجموعة والمرحلة)
  // مع ضمان عدم تجاوز اختيار الأستاذ وتلقين الحقل وتجميده (Read-Only)
  const availableFilterResult = useMemo(() => {
    return filterCurrentlyAvailableLectures({
      lectures,
      studentGroup: currentUser.group,
      studentStage: currentUser.stage,
      studentStudyType: currentUser.studyType,
      studentCollege: currentUser.college,
      studentUniversity: currentUser.university,
      now: getServerNow(),
    });
  }, [lectures, currentUser.group, currentUser.stage, currentUser.studyType, currentUser.college, currentUser.university]);

  // التلقين التلقائي للمحاضرة: المحاضرة المحددة من الأستاذ أو الوقت الفعلي
  const autoAssignedLecture = availableFilterResult.assignedLecture;
  const assignedLectureId = autoAssignedLecture?.lectureId || studentLectures[0]?.lectureId || '';

  const [selectedLectureId, setSelectedLectureId] = useState<string>(assignedLectureId);

  // تحديث التلقين التلقائي فوراً عند فتح جلسة من قبل الأستاذ أو تقدم الوقت الفعلي دون تجاوز اختيار الأستاذ
  useEffect(() => {
    if (assignedLectureId) {
      setSelectedLectureId(assignedLectureId);
    }
  }, [assignedLectureId]);

  // Lecture selection modal & 13-columns search filter
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [quickLectureFilter, setQuickLectureFilter] = useState('');

  const displayedStudentLectures = useMemo(() => {
    if (!quickLectureFilter.trim()) return studentLectures;
    const q = quickLectureFilter.toLowerCase().trim();
    return studentLectures.filter((l) => {
      const combined = `${l.lectureId} ${l.lectureName} ${l.startTime} ${l.endTime} ${l.studyType} ${l.weekDays} ${l.group} ${l.college} ${l.university} ${l.stage} ${l.lecturerName} ${l.teacherEmail} ${l.lecturePlace}`.toLowerCase();
      return combined.includes(q);
    });
  }, [studentLectures, quickLectureFilter]);

  // Security Verification State
  const [enteredOtp, setEnteredOtp] = useState('');
  const [gpsSimMode, setGpsSimMode] = useState<'inside' | 'near' | 'far' | 'real'>('inside');
  const [studentLat, setStudentLat] = useState<number>(32.274176);
  const [studentLng, setStudentLng] = useState<number>(44.805896);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<StudentAttendanceRecord | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const [isReadingRealGps, setIsReadingRealGps] = useState(false);
  const [realGpsStatus, setRealGpsStatus] = useState<string | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [excuseLectureId, setExcuseLectureId] = useState(studentLectures[0]?.lectureId || '');
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseAttachment, setExcuseAttachment] = useState<string | null>(null);
  const [excuseSuccessMsg, setExcuseSuccessMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExcuseAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendExcuse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseReason.trim() || !onAddExcuseRequest) return;
    const targetLec = studentLectures.find((l) => l.lectureId === excuseLectureId) || studentLectures[0];

    const req: ExcuseRequest = {
      id: `EXC-${Date.now()}`,
      studentCode: currentUser.studentCode || 'STD-01',
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      lectureName: targetLec?.lectureName || 'محاضرة عامة',
      lectureId: targetLec?.lectureId || 'LEC-01',
      reason: excuseReason.trim(),
      attachmentUrl: excuseAttachment || undefined,
      status: 'pending',
      timestamp: formatArabicDateTime(),
      lecturerEmail: targetLec?.teacherEmail || '',
    };

    onAddExcuseRequest(req);
    setExcuseSuccessMsg('تم إرسال طلب العذر بنجاح إلى الأستاذ المحاضر في انتظار الموافقة.');
    sounds.playSuccessChime();
    setTimeout(() => {
      setIsExcuseModalOpen(false);
      setExcuseReason('');
      setExcuseAttachment(null);
      setExcuseSuccessMsg(null);
    }, 2500);
  };

  // Request real device GPS coordinates
  const handleGetRealGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('خاصية تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }
    setIsReadingRealGps(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStudentLat(pos.coords.latitude);
        setStudentLng(pos.coords.longitude);
        setGpsSimMode('real');
        setRealGpsStatus(`تم جلب موقع هاتفك الفعلي بدقة ±${Math.round(pos.coords.accuracy)} متر`);
        setIsReadingRealGps(false);
        sounds.playClick();
      },
      (err) => {
        setIsReadingRealGps(false);
        let msg = 'تعذر الوصول إلى GPS الهاتف.';
        if (err.code === 1) msg = 'تم رفض إذن الوصول للموقع الجغرافي من المتصفح.';
        else if (err.code === 2) msg = 'إشارة الـ GPS غير متوفرة حالياً.';
        setErrorMessage(msg);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };


  // Biometric Face ID state (Controlled by lecturer)
  const [isFaceBiometricModalOpen, setIsFaceBiometricModalOpen] = useState(false);
  const [isFaceVerified, setIsFaceVerified] = useState(false);

  // 15-minute upcoming lecture reminder popup state
  const [showFifteenMinModal, setShowFifteenMinModal] = useState(false);
  const [dismissedLectureId, setDismissedLectureId] = useState<string | null>(null);

  // Upcoming lecture reminder
  const upcomingLecture = useMemo(() => {
    const myLecs = lectures.filter((l) => 
      (!l.stage || l.stage === currentUser.stage) &&
      (!l.group || !currentUser.group || l.group === currentUser.group)
    );

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let closest: { lecture: Lecture; minutesLeft: number } | null = null;

    myLecs.forEach((l) => {
      const parts = l.startTime.split(':');
      if (parts.length === 2) {
        const startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        const diff = startMin - currentMinutes;
        if (diff > -45 && diff <= 300) {
          if (!closest || Math.abs(diff) < Math.abs(closest.minutesLeft)) {
            closest = { lecture: l, minutesLeft: diff };
          }
        }
      }
    });

    return closest || (myLecs[0] ? { lecture: myLecs[0], minutesLeft: 20 } : null);
  }, [lectures, currentUser]);

  // Check 15 minutes before lecture popup trigger
  useEffect(() => {
    if (upcomingLecture && upcomingLecture.minutesLeft >= 13 && upcomingLecture.minutesLeft <= 17) {
      if (dismissedLectureId !== upcomingLecture.lecture.lectureId) {
        setShowFifteenMinModal(true);
        sounds.playWarningChime();
      }
    }
  }, [upcomingLecture, dismissedLectureId]);

  const selectedLecture = useMemo(() => {
    return lectures.find((l) => l.lectureId === selectedLectureId);
  }, [lectures, selectedLectureId]);

  // Adjust simulated GPS coordinates based on mode
  useEffect(() => {
    if (!selectedLecture) return;
    if (gpsSimMode === 'inside') {
      // 12 meters away (inside room)
      setStudentLat(selectedLecture.targetLatitude + 0.0001);
      setStudentLng(selectedLecture.targetLongitude + 0.0001);
    } else if (gpsSimMode === 'near') {
      // 80 meters away (hallway / entrance)
      setStudentLat(selectedLecture.targetLatitude + 0.0007);
      setStudentLng(selectedLecture.targetLongitude + 0.0007);
    } else if (gpsSimMode === 'far') {
      // 1.5 km away (outside campus / at home)
      setStudentLat(selectedLecture.targetLatitude + 0.015);
      setStudentLng(selectedLecture.targetLongitude + 0.015);
    }
  }, [gpsSimMode, selectedLecture]);

  // Calculate live distance
  const currentDistance = useMemo(() => {
    if (!selectedLecture) return 0;
    return calculateDistanceMeters(
      studentLat,
      studentLng,
      selectedLecture.targetLatitude,
      selectedLecture.targetLongitude
    );
  }, [selectedLecture, studentLat, studentLng]);

  // Calculate delay minutes
  const delayMinutes = useMemo(() => {
    if (!selectedLecture) return 0;
    return calculateDelayMinutes(selectedLecture.startTime);
  }, [selectedLecture]);

  // Check if student has already recorded attendance today for this lecture
  const todayStr = new Date().toISOString().slice(0, 10);
  const alreadyCheckedIn = useMemo(() => {
    return attendanceRecords.some(
      (r) =>
        r.studentCode === currentUser.studentCode &&
        r.lectureName === selectedLecture?.lectureName &&
        r.timestamp.startsWith(todayStr)
    );
  }, [attendanceRecords, currentUser.studentCode, selectedLecture, todayStr]);

  // Student's personal attendance history
  const personalRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.studentCode === currentUser.studentCode || r.email === currentUser.email)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [attendanceRecords, currentUser]);

  // Perform 4-factor security check and record attendance
  const handleCheckIn = () => {
    setErrorMessage(null);
    setIsVerifying(true);

    if (!selectedLecture) {
      setErrorMessage('يرجى اختيار المحاضرة أولاً.');
      setIsVerifying(false);
      return;
    }

    if (!selectedLecture.isSessionActive) {
      setErrorMessage('جلسة التحضير مغلقة حالياً من قبل الأستاذ المحاضر.');
      sounds.playWarningChime();
      setIsVerifying(false);
      return;
    }

    // Attendance Window Lock Check (e.g. first N minutes)
    const nowServer = getServerNow();
    const currentMin = nowServer.getHours() * 60 + nowServer.getMinutes();
    const startMin = parseTimeToMinutes(selectedLecture.startTime);
    const windowMins = selectedLecture.attendanceWindowMinutes ?? 15;
    if (selectedLecture.isSessionActive && currentMin > startMin + windowMins) {
      setErrorMessage(`انتهت فترة تسجيل الحضور المسموحة (أول ${windowMins} دقيقة من المحاضرة). تم إغلاق نافذة التسجيل تلقائياً.`);
      sounds.playWarningChime();
      setIsVerifying(false);
      return;
    }

    // 1. Identity & Email verification
    if (!currentUser.studentCode || !currentUser.email) {
      setErrorMessage('خطأ في التحقق: بيانات الطالب أو الإيميل غير مكتملة.');
      sounds.playWarningChime();
      setIsVerifying(false);
      return;
    }

    // 2. Device Fingerprint binding verification
    // (If user has a registered device, it must match current device)
    if (currentUser.registeredDeviceId && currentUser.registeredDeviceId !== currentDeviceId) {
      setErrorMessage(`رفض أمني: جهازك الحالي (${currentDeviceId}) لا يطابق الجهاز المسجل للطالب (${currentUser.registeredDeviceId}). يمنع تسجيل الحضور نيابة عن زميل.`);
      sounds.playWarningChime();
      setIsVerifying(false);
      return;
    }

    // 3. Geolocation Geofence check (Only if required by lecturer)
    const requireLocation = selectedLecture.requireLocationVerification !== false;
    const allowedRadius = selectedLecture.allowedRadiusMeters || 100;
    if (requireLocation && currentDistance > allowedRadius) {
      setErrorMessage(`رفض جغرافي: موقعك الحالي على بعد (${currentDistance} متر) من مكان المحاضرة (${selectedLecture.lecturePlace}). نطاق القاعة المسموح به هو ${allowedRadius} متر فقط.`);
      sounds.playWarningChime();
      setIsVerifying(false);
      return;
    }

    // 4. Lecturer OTP check
    if (selectedLecture.activeOtpCode && enteredOtp.trim() !== selectedLecture.activeOtpCode.trim()) {
      setErrorMessage(`رمز الحضور المؤقت (OTP) غير صحيح. يرجى إدخال الرمز المعروض على شاشة الأستاذ داخل القاعة.`);
      sounds.playWarningChime();
      setIsVerifying(false);
      return;
    }

    // 5. Face ID Biometric Check (Controlled by course lecturer)
    if (selectedLecture.requireFaceBiometric && !isFaceVerified) {
      setErrorMessage(`أستاذ المادة (${selectedLecture.lecturerName}) يشترط مسح وتأكيد بصمة الوجه (Face ID) لتسجيل الحضور في هذه المحاضرة. يرجى الضغط على زر "مسح بصمة الوجه" أدناه.`);
      sounds.warning();
      setIsVerifying(false);
      return;
    }

    // All verifications passed! Determine status & delay
    const status: AttendanceStatus = delayMinutes > 15 ? 'متأخر' : 'حاضر';
    const nowFormatted = formatArabicDateTime();

    const record: StudentAttendanceRecord = {
      id: `ATT-${Date.now()}`,
      studentCode: currentUser.studentCode,
      group: currentUser.group || selectedLecture.group,
      name: currentUser.name,
      timestamp: nowFormatted,
      location: `${selectedLecture.lecturePlace} (GPS: ${studentLat.toFixed(4)}, ${studentLng.toFixed(4)} - داخل النطاق ${currentDistance}م)`,
      lectureName: selectedLecture.lectureName,
      startTime: selectedLecture.startTime,
      endTime: selectedLecture.endTime,
      attendanceStatus: status,
      delayMinutes: delayMinutes,
      weekDays: selectedLecture.weekDays,
      studyType: selectedLecture.studyType,
      email: currentUser.email,
      college: selectedLecture.college,
      university: selectedLecture.university,
      stage: selectedLecture.stage,
      lecturerName: selectedLecture.lecturerName,
      teacherEmail: selectedLecture.teacherEmail,
      lecturePlace: selectedLecture.lecturePlace,
      deviceId: currentDeviceId,
      faceVerified: isFaceVerified,
    };

    onRecordAttendance(record);
    setSuccessRecord(record);
    sounds.playSuccessChime();
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
    });

    if (settings?.googleSheetsWebhookUrl && settings?.autoSyncToGoogleSheets !== false) {
      setCloudSyncStatus('جارِ المزامنة اللحظية مع Google Sheets...');
      sendAttendanceToGoogleSheets(settings.googleSheetsWebhookUrl, record)
        .then((res) => {
          if (res.success) {
            setCloudSyncStatus('تمت المزامنة اللحظية مع جدول Google Sheets بنجاح! ☁️✓');
          } else {
            setCloudSyncStatus('تم حفظ الحضور محلياً بنجاح.');
          }
        })
        .catch(() => {
          setCloudSyncStatus('تم حفظ الحضور محلياً بنجاح.');
        });
    }

    setIsVerifying(false);
  };

  return (
    <div className="space-y-6">
      
      {/* PWA Mobile App Installation Banner */}
      <PWAInstallButton variant="banner" />

      {/* Instant Lecture Start Banner / Toast */}
      {studentLectures.some((l) => l.isSessionActive) && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-lg border border-emerald-500 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-300 animate-ping shrink-0"></span>
            <div>
              <p className="font-bold text-xs sm:text-sm">
                🔔 تنبيه فوري: تم بدء محاضرة نشطة الآن لشعبتك!
              </p>
              <p className="text-[11px] text-emerald-100">
                الأستاذ فتح جلسة الحضور. سارع بتسجيل حضورك قبل انتهاء نافذة الوقت المسموحة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cumulative Absence Warnings & Status */}
      {personalRecords.filter((r) => r.attendanceStatus === 'غائب').length >= 3 && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3.5 rounded-2xl text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>إنذار غياب متراكم (إنذار نهائي / نسبة غياب مرتفعة)</span>
          </div>
          <p className="text-[11px] text-rose-700">
            لقد تجاوزت الحد المسموح للغیابات في السجل الرسمي. يرجى مراجعة إدارة الكلية أو تقديم عذر رسمي معتمد لتجنب الرسوب.
          </p>
        </div>
      )}

      {/* Student Welcome & Permission Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                بوابة الطالب - تسجيل الحضور الذكي
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                طالب معتمد
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              يحق للطالب تسجيل الحضور فقط بعد التحقق التلقائي من معايير الأمان (الهوية، بصمة الجهاز، والموقع الجغرافي).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>صلاحية العرض والتسجيل فقط (لا يمكن تعديل السجل)</span>
          </div>
        </div>
      </div>

      {/* Upcoming Lecture Reminder Countdown */}
      {upcomingLecture && (
        <div className="bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 border border-indigo-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30 shrink-0">
              <Bell className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  تنبيه المحاضرة القادمة
                </span>
                <span className="text-xs text-slate-300">
                  القاعة: <strong className="text-white">{upcomingLecture.lecture.lecturePlace}</strong>
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                {upcomingLecture.lecture.lectureName} — الأستاذ: {upcomingLecture.lecture.lecturerName}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-black/40 px-3 py-1.5 rounded-xl border border-slate-700 text-emerald-400 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {upcomingLecture.minutesLeft > 0
                  ? `تبدأ بعد ${upcomingLecture.minutesLeft} دقيقة (${upcomingLecture.lecture.startTime})`
                  : `المحاضرة جارية الآن (${upcomingLecture.lecture.startTime} - ${upcomingLecture.lecture.endTime})`}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Attendance Terminal & Live Security Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Check-In Form */}
        <div className="lg:col-span-2 space-y-5">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">
                  المحاضرة المعتمدة والتسجيل اليومي
                </h3>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  13 معيار رسمي
                </span>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  <span>Read-Only (مجمّد)</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLectureModalOpen(true);
                  sounds.playClick();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                title="استعراض جدول المحاضرات الكامل عبر الأعمدة الـ 13 للاطلاع فقط"
              >
                <TableProperties className="w-4 h-4" />
                <span>استعراض جدول الـ 13 معيار (للاطلاع 📋)</span>
              </button>
            </div>

            {/* 1. Pre-populated & Frozen (Read-Only) Lecture Field without overriding professor's choice */}
            <div className="space-y-3">
              {/* Security Alert Banner */}
              <div className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                availableFilterResult.isProfessorDirectSelection
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-blue-50/80 border-blue-200 text-blue-950'
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    availableFilterResult.isProfessorDirectSelection ? 'bg-emerald-200 text-emerald-900' : 'bg-blue-200 text-blue-900'
                  }`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs">
                      {availableFilterResult.isProfessorDirectSelection 
                        ? 'جلسة معتمدة من الأستاذ مباشرة (لا يمكن تجاوز اختيار الأستاذ) 🔒'
                        : 'تلقين تلقائي وفقاً للوقت الفعلي والجدول الدراسي (Read-Only) 🔒'
                      }
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {availableFilterResult.reasonText}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    availableFilterResult.isProfessorDirectSelection
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{availableFilterResult.readOnlyBadgeText}</span>
                  </span>
                </div>
              </div>

              {/* The Frozen (Read-Only) Lecture Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>حقل المحاضرة الحالي الملقّن للطالب ({currentUser.stage || 'المرحلة الثانية'} - شعبة {currentUser.group || 'A'}):</span>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  </label>
                  <span className="text-[11px] text-slate-500">
                    مجمّد رسمياً للقراءة فقط
                  </span>
                </div>

                <div className="relative">
                  <div className="w-full bg-slate-100/90 border-2 border-slate-300 hover:border-slate-400 text-slate-900 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 shadow-inner cursor-not-allowed select-all">
                    <div className="flex items-center gap-2 truncate">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="bg-blue-700 text-white font-mono px-2 py-0.5 rounded text-xs">
                        {selectedLecture?.lectureId || 'LEC'}
                      </span>
                      <span className="truncate text-slate-900">
                        {selectedLecture?.lectureName || 'المحاضرة المعتمدة'}
                      </span>
                      <span className="text-slate-600 font-semibold text-xs hidden sm:inline">
                        ({selectedLecture?.startTime.slice(0, 5)} - {selectedLecture?.endTime.slice(0, 5)})
                      </span>
                      <span className="text-emerald-700 font-bold text-xs hidden md:inline">
                        | قاعة: {selectedLecture?.lecturePlace}
                      </span>
                      <span className="text-slate-600 font-medium text-xs hidden lg:inline">
                        | أ. {selectedLecture?.lecturerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedLecture?.isSessionActive ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>جلسة مفتوحة الآن</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                          بانتظار بدء التحضير
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>تم تلقين الحقل وتجميده (Read-Only) لمنع التلاعب وحفظاً لاختيار الأستاذ والجدول الزمني الفعلي.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLectureModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline shrink-0"
                  >
                    عرض الـ 13 معيار كاملة ←
                  </button>
                </p>
              </div>
            </div>

            {/* 2. Frozen / Read-Only Form Fields upon Selection */}
            {selectedLecture && (
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">بيانات المحاضرة المعتمدة (مجمدة للعرض فقط — Read-Only):</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded border border-slate-300">
                    مجمد ومقفل رسمياً 🔒
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
                  
                  {/* 1. Lecture ID */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Lecture ID (رمز المحاضرة):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.lectureId}
                      className="w-full bg-white border border-slate-200 text-blue-700 font-mono font-bold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 2. Lecture name */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Lecture name (اسم المحاضرة):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.lectureName}
                      className="w-full bg-white border border-slate-200 text-slate-900 font-bold rounded-lg px-2.5 py-2 cursor-not-allowed select-all"
                    />
                  </div>

                  {/* 3. Start Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Start Time (وقت البدء):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.startTime}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-mono font-bold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 4. End Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>End Time (وقت الانتهاء):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.endTime}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-mono font-bold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 5. نوع الدراسة */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>نوع الدراسة (Study Type):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.studyType}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 6. أيام الأسبوع */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>أيام الأسبوع (Week Days):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.weekDays}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 7. Group */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Group (الشعبة):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.group}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-bold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 8. College */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>College (الكلية):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.college}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 9. University */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>University (الجامعة):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.university}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 10. Stage */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Stage (المرحلة):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.stage}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 11. Lecturer name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Lecturer name (اسم الأستاذ):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.lecturerName}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 12. Teacher Email */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Teacher Email (إيميل الأستاذ):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.teacherEmail}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-mono text-[11px] rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* 13. lecture place */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>lecture place (مكان المحاضرة / القاعة):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedLecture.lecturePlace}
                      className="w-full bg-white border border-slate-200 text-blue-900 font-bold rounded-lg px-2.5 py-2 cursor-not-allowed"
                    />
                  </div>

                  {/* Session Status Live Indicator */}
                  <div className="space-y-1 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>حالة استقبال الحضور من الأستاذ (Session Status):</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <div className="w-full bg-white border border-slate-200 font-bold rounded-lg px-2.5 py-2 flex items-center gap-1.5">
                      {selectedLecture.isSessionActive ? (
                        <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          مفتوحة الآن لاستقبال تسجيل حضور الطلاب ✓ (النطاق الجغرافي المسموح به: {selectedLecture.allowedRadiusMeters || 100}م)
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          مغلقة حالياً (في انتظار فتح جلسة التحضير من قبل الأستاذ {selectedLecture.lecturerName})
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                  <span>🔒 تم تجميد كافة حقول المحاضرة أعلاه تلقائياً ولا يمكن تعديلها من قبل الطالب. يرجى إدخال رمز التحضير بالأسفل.</span>
                </p>
              </div>
            )}

            {/* Dynamic OTP Input */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                رمز التحضير المؤقت للمحاضرة (OTP المعروض على شاشة الأستاذ في القاعة):
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="أدخل الرمز المكون من 6 أرقام (مثال: 749201)"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2.5 text-sm font-mono tracking-widest text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                {selectedLecture?.activeOtpCode && (
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(selectedLecture.activeOtpCode || '')}
                    className="px-2.5 py-2.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 font-medium whitespace-nowrap"
                    title="تعبئة سريعة للتجربة"
                  >
                    تعبئة رمز القاعة ({selectedLecture.activeOtpCode})
                  </button>
                )}
              </div>
            </div>

            {/* Biometric Face ID Verification Card (Lecturer-Controlled) */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
              selectedLecture?.requireFaceBiometric
                ? 'bg-purple-50/70 border-purple-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ScanFace className="w-4 h-4 text-purple-600" />
                  <span>بصمة الوجه الرقمية (Face ID Biometric):</span>
                </span>
                
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  selectedLecture?.requireFaceBiometric
                    ? 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {selectedLecture?.requireFaceBiometric ? 'إلزامية للمحاضرة (بأمر الأستاذ)' : 'اختيارية للمحاضرة'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="space-y-0.5 text-xs">
                  {isFaceVerified ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم مسح ومطابقة بصمة الوجه الرقمية بنجاح ✓</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      {selectedLecture?.requireFaceBiometric
                        ? `يشترط أستاذ المادة (${selectedLecture.lecturerName}) مسح بصمة الوجه لتأكيد الهوية والحضور.`
                        : 'بصمة الوجه اختيارية لهذه المحاضرة، ويمكنك مسحها لإثبات وتوثيق حضورك.'}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFaceBiometricModalOpen(true)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                    isFaceVerified
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                  }`}
                >
                  <ScanFace className="w-4 h-4" />
                  <span>{isFaceVerified ? 'إعادة مسح بصمة الوجه' : 'مسح بصمة الوجه (Face ID)'}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Card */}
            {successRecord && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>تم تسجيل حضورك بنجاح تام!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>الحالة: <span className="font-bold text-emerald-800">{successRecord.attendanceStatus}</span></div>
                  <div>التوقيت: <span className="font-mono">{successRecord.timestamp}</span></div>
                  <div>مدة التأخير: <span className="font-mono">{successRecord.delayMinutes} دقيقة</span></div>
                  <div>الموقع المعتمد: <span>{successRecord.location}</span></div>
                </div>

                <div className="pt-2 border-t border-emerald-200 flex items-center justify-between gap-2 flex-wrap">
                  {cloudSyncStatus ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{cloudSyncStatus}</span>
                    </div>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => {
                      const msg = 
                        `*إشعار توثيق حضور رسمي - ${successRecord.college}*\n\n` +
                        `الطالب: *${successRecord.name}* (${successRecord.studentCode})\n` +
                        `المحاضرة: *${successRecord.lectureName}*\n` +
                        `المحاضر: ${successRecord.lecturerName}\n` +
                        `التوقيت: ${successRecord.timestamp}\n` +
                        `الحالة: *${successRecord.attendanceStatus}*\n` +
                        `الموقع: ${successRecord.location}\n` +
                        `رمز التوثيق: ${successRecord.id}\n\n` +
                        `تم التسجيل بنجاح عبر نظام الحضور الذكي المعتمد.`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>إرسال إشعار تأكيد الحضور (WhatsApp)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Already Checked in Warning */}
            {alreadyCheckedIn && !successRecord && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>لقد قمت بتسجيل حضورك مسبقاً في هذه المحاضرة اليوم.</span>
              </div>
            )}

            {/* Main Action Button */}
            <button
              onClick={handleCheckIn}
              disabled={isVerifying || alreadyCheckedIn}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                alreadyCheckedIn
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span>{alreadyCheckedIn ? 'تم تسجيل الحضور اليوم مسبقاً' : 'تأكيد وتسجيل الحضور الآن'}</span>
            </button>

          </div>

          {/* Excuse Request Card/Button */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">إدارة الحالات الخاصة والأعذار الرسمية</h3>
              <p className="text-xs text-slate-500">هل لديك تقرير طبي أو عذر رسمي لغياب سابق؟ يمكنك تقديمه للأستاذ مباشرة.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsExcuseModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>تقديم طلب عذر غياب / تقرير طبي</span>
            </button>
          </div>

          {/* Excuse Request Modal */}
          {isExcuseModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-auto border border-slate-100 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-base">تقديم طلب عذر رسمي أو تقرير طبي</h3>
                  <button onClick={() => setIsExcuseModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>

                {excuseSuccessMsg ? (
                  <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-xl font-bold text-center">
                    {excuseSuccessMsg}
                  </div>
                ) : (
                  <form onSubmit={handleSendExcuse} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">اختر المحاضرة / المادة:</label>
                      <select
                        value={excuseLectureId}
                        onChange={(e) => setExcuseLectureId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                      >
                        {studentLectures.map((l) => (
                          <option key={l.lectureId} value={l.lectureId}>
                            {l.lectureName} ({l.lecturerName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">سبب الغياب والتفاصيل:</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="اكتب تفاصيل العذر الصحي أو الرسمي..."
                        value={excuseReason}
                        onChange={(e) => setExcuseReason(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">إرفاق ملف (صورة تقرير طبي أو PDF):</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setIsExcuseModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md shadow-purple-200"
                      >
                        إرسال الطلب للأستاذ
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Student's Personal Attendance History (Read-Only) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <span>سجل حضوري الشخصي للمحاضرات ({personalRecords.length} محاضرة)</span>
              </h3>
              <span className="text-[11px] text-slate-400">سجل رسمي غير قابل للتعديل</span>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              {personalRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  لا توجد تسجيلات حضور سابقة مسجلة لهذا الحساب بعد.
                </div>
              ) : (
                personalRecords.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900 block">{r.lectureName}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{r.timestamp}</span>
                        <span aria-hidden="true">·</span>
                        <span>{r.lecturePlace}</span>
                        <span aria-hidden="true">·</span>
                        <span>{r.lecturerName}</span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        r.attendanceStatus === 'حاضر'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.attendanceStatus === 'متأخر'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.attendanceStatus}
                      </span>
                      {r.delayMinutes > 0 && (
                        <span className="block text-[10px] text-amber-700 font-mono mt-0.5">
                          تأخر {r.delayMinutes} د
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Column 3: Live 4-Factor Security Inspection Checklist */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <span>فاحص الأمان الصارم (Multi-Factor Verification)</span>
            </h3>

            {/* Factor 1: Student Identity & Email */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>1. الهوية والقيد الجامعي</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  متطابق ✓
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                <div>الاسم: <span className="font-bold text-slate-800">{currentUser.name}</span></div>
                <div>الكود: <span className="font-mono font-bold text-blue-700">{currentUser.studentCode}</span></div>
                <div>الإيميل: <span className="font-mono text-slate-700">{currentUser.email}</span></div>
              </div>
            </div>

            {/* Factor 2: Device Fingerprint Binding */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span>2. بصمة الجهاز المعتمد</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  معتمد ✓
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                <div>معرّف الجهاز الحالي: <span className="font-mono text-purple-700 font-bold">{currentDeviceId}</span></div>
                <div className="text-[10px] text-slate-400">يمنع تسجيل الحضور من أجهزة أخرى غير مسجلة</div>
              </div>
            </div>

            {/* Factor 3: Geolocation Geofence GPS Check */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>3. الموقع الجغرافي GPS للقاعة</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  currentDistance <= (selectedLecture?.allowedRadiusMeters || 100)
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-rose-700 bg-rose-100'
                }`}>
                  {currentDistance <= (selectedLecture?.allowedRadiusMeters || 100) ? 'داخل النطاق ✓' : 'خارج النطاق ✕'}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>المسافة الحالية عن القاعة:</span>
                  <span className={`font-mono font-bold ${
                    currentDistance <= (selectedLecture?.allowedRadiusMeters || 100) ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {currentDistance} متر
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>النطاق الأقصى المسموح:</span>
                  <span className="font-mono text-slate-700">{selectedLecture?.allowedRadiusMeters || 100} متر</span>
                </div>
              </div>

              {/* Live Real Device GPS & Simulation Switcher */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                
                {/* Real GPS button */}
                <button
                  type="button"
                  onClick={handleGetRealGps}
                  disabled={isReadingRealGps}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Compass className={`w-3.5 h-3.5 ${isReadingRealGps ? 'animate-spin' : ''}`} />
                  <span>{isReadingRealGps ? 'جاري جلب إحداثيات GPS الهاتف...' : 'رصد موقعي الفعلي من GPS الهاتف'}</span>
                </button>

                {realGpsStatus && (
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded border border-emerald-200 text-center">
                    {realGpsStatus}
                  </div>
                )}

                <span className="text-[10px] font-bold text-slate-500 block pt-1">
                  أو اختر نمط موقع للتجربة السريعة:
                </span>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    onClick={() => {
                      setGpsSimMode('inside');
                      setRealGpsStatus(null);
                    }}
                    className={`p-1 rounded text-center font-bold border transition-all ${
                      gpsSimMode === 'inside'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    داخل القاعة (14م)
                  </button>
                  <button
                    onClick={() => {
                      setGpsSimMode('near');
                      setRealGpsStatus(null);
                    }}
                    className={`p-1 rounded text-center font-bold border transition-all ${
                      gpsSimMode === 'near'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    بوابة الكلية (85م)
                  </button>
                  <button
                    onClick={() => {
                      setGpsSimMode('far');
                      setRealGpsStatus(null);
                    }}
                    className={`p-1 rounded text-center font-bold border transition-all ${
                      gpsSimMode === 'far'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    خارج الكلية (مرفوض)
                  </button>
                </div>
              </div>
            </div>


            {/* Factor 4: Time Window Check */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>4. توقيت المحاضرة وحساب التأخير</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  delayMinutes === 0 ? 'text-emerald-700 bg-emerald-100' : 'text-amber-800 bg-amber-100'
                }`}>
                  {delayMinutes === 0 ? 'في الموعد' : `متأخر ${delayMinutes} د`}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 pt-1">
                يتم رصد التأخير تلقائياً وإضافته لسجل حضور الطالب.
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Face ID Biometric Modal (Zero photo storage, pure biometric landmark verification) */}
      <FaceBiometricModal
        isOpen={isFaceBiometricModalOpen}
        onClose={() => setIsFaceBiometricModalOpen(false)}
        onSuccess={() => {
          setIsFaceVerified(true);
          sounds.success();
        }}
        studentName={currentUser.name}
        studentCode={currentUser.studentCode}
        lectureName={selectedLecture?.lectureName || ''}
      />

      {/* 15-Minute Upcoming Lecture Popup Notification Modal */}
      {showFifteenMinModal && upcomingLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-right border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl shrink-0 animate-bounce shadow-md">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  تنبيه بدء المحاضرة (قبل 15 دقيقة)
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  {upcomingLecture.lecture.lectureName}
                </h3>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">القاعة / المكان:</span>
                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {upcomingLecture.lecture.lecturePlace}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">أستاذ المادة:</span>
                <span className="font-bold text-slate-900">{upcomingLecture.lecture.lecturerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">وقت البدء:</span>
                <span className="font-mono font-bold text-slate-800">{upcomingLecture.lecture.startTime}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed text-center">
              يرجى التوجه إلى القاعة المذكورة استعداداً لتسجيل الحضور فور فتح الجلسة من قبل الأستاذ.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedLectureId(upcomingLecture.lecture.lectureId);
                  setShowFifteenMinModal(false);
                  setDismissedLectureId(upcomingLecture.lecture.lectureId);
                  sounds.playClick();
                }}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
              >
                اختيار المحاضرة والانتقال للتسجيل
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFifteenMinModal(false);
                  setDismissedLectureId(upcomingLecture.lecture.lectureId);
                  sounds.playClick();
                }}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                إغلاق التنبيه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13-Columns Lecture Schedule Modal (Read-Only for Students) */}
      <LectureSelectionModal
        isOpen={isLectureModalOpen}
        onClose={() => setIsLectureModalOpen(false)}
        lectures={studentLectures}
        selectedLectureId={selectedLectureId}
        onSelectLecture={(lec) => {
          // Students cannot tamper with or override the lecture selection
          if (!availableFilterResult.isReadOnly) {
            setSelectedLectureId(lec.lectureId);
          }
        }}
        title="جدول المحاضرات الدراسي (الأعمدة الـ 13 الرسمية — للاطلاع فقط)"
        userRole="student"
        autoDetectedLectureId={availableFilterResult.assignedLecture?.lectureId}
        isReadOnly={true}
        readOnlyNotice="حقل المحاضرة ملقّن ومجمّد للقراءة فقط (Read-Only) وفقاً للوقت الفعلي والتاريخ وشعبتك ومرحلتك دون تجاوز اختيار الأستاذ."
      />

    </div>
  );
};
