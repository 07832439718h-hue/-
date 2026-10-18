import React, { useState, useMemo } from 'react';
import { 
  UserAccount, 
  Lecture, 
  StudentAttendanceRecord, 
  AttendanceStatus,
  ExcuseRequest
} from '../types/attendance';
import { exportAttendanceToCSV, exportAttendanceToExcel, exportSingleLectureExcel, exportSingleLecturePDF } from '../utils/appsheetExport';
import { sounds } from '../utils/audio';
import { getServerNow } from '../utils/serverTime';
import { calculateStudentAbsence, autoSelectLecture, normalizeArabicDay, parseTimeToMinutes } from '../utils/geo';
import QRCode from 'qrcode';
import { 
  GraduationCap, 
  Play, 
  Square, 
  RefreshCw, 
  QrCode, 
  MapPin, 
  Download, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  FileSpreadsheet,
  FileText,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  Minimize2,
  MessageSquare,
  Timer,
  Sparkles,
  Zap,
  ScanFace,
  Search,
  TableProperties
} from 'lucide-react';
import { EditAssignedLectureModal } from './EditAssignedLectureModal';
import { LectureSelectionModal } from './LectureSelectionModal';

interface LecturerPortalProps {
  currentUser: UserAccount;
  lectures: Lecture[];
  attendanceRecords: StudentAttendanceRecord[];
  onUpdateLecture: (lecture: Lecture) => void;
  onUpdateAttendanceRecord: (record: StudentAttendanceRecord) => void;
  onOpenShareModal?: () => void;
  excuseRequests?: ExcuseRequest[];
  onUpdateExcuseRequest?: (req: ExcuseRequest) => void;
}

export const LecturerPortal: React.FC<LecturerPortalProps> = ({
  currentUser,
  lectures,
  attendanceRecords,
  onUpdateLecture,
  onUpdateAttendanceRecord,
  onOpenShareModal,
  excuseRequests,
  onUpdateExcuseRequest,
}) => {
  // Professor only sees their own lectures strictly based on Teacher Email!
  const myLectures = useMemo(() => {
    const userEmail = currentUser.email?.toLowerCase().trim();
    return lectures.filter((l) => l.teacherEmail?.toLowerCase().trim() === userEmail);
  }, [lectures, currentUser.email]);

  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'available' | 'all'>('available');

  // 1. فلترة المحاضرات المتاحة حالياً وفق الوقت الفعلي والتاريخ والجلسة النشطة
  const currentlyAvailableLectures = useMemo(() => {
    const now = getServerNow();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const todayRaw = dayNamesAr[now.getDay()];
    const todayNorm = normalizeArabicDay(todayRaw);

    // أ) المحاضرات المفتوحة بجلسة نشطة أو الجارية في الوقت الفعلي
    const live = myLectures.filter((l) => {
      if (l.isSessionActive) return true;
      const lDayNorm = normalizeArabicDay(l.weekDays || '');
      const matchDay = !l.weekDays || lDayNorm.includes(todayNorm) || lDayNorm.includes('يوميا') || lDayNorm.includes('كل الايام');
      if (!matchDay) return false;
      const startMin = parseTimeToMinutes(l.startTime);
      const endMin = parseTimeToMinutes(l.endTime) || startMin + 120;
      return currentMinutes >= startMin - 15 && currentMinutes <= endMin + 30;
    });

    if (live.length > 0) return live;

    // ب) المحاضرات المجدولة لليوم
    const today = myLectures.filter((l) => {
      const lDayNorm = normalizeArabicDay(l.weekDays || '');
      return !l.weekDays || lDayNorm.includes(todayNorm) || lDayNorm.includes('يوميا');
    });

    if (today.length > 0) return today;

    // ج) الرجوع لجميع محاضرات الأستاذ
    return myLectures;
  }, [myLectures]);

  // التحديد الذكي التلقائي للمحاضرة استناداً للوقت الفعلي
  const autoDetectResult = useMemo(() => {
    return autoSelectLecture(myLectures, {
      teacherEmail: currentUser.email,
      now: getServerNow(),
    });
  }, [myLectures, currentUser.email]);

  const autoDetectedLectureId = autoDetectResult.bestLecture?.lectureId || currentlyAvailableLectures[0]?.lectureId || myLectures[0]?.lectureId || '';
  const selectedLectureId = manualSelectedId !== null ? manualSelectedId : autoDetectedLectureId;

  // القائمة المرشحة للعرض بالقائمة المنسدلة بناءً على خيار الفلترة (المتاحة حالياً أو الكل)
  const candidateLectures = useMemo(() => {
    const base = filterMode === 'available' ? currentlyAvailableLectures : myLectures;
    // التأكد من وجود المحاضرة المحددة داخل القائمة لتفادي عدم تطابق الـ select
    if (selectedLectureId && !base.some((l) => l.lectureId === selectedLectureId)) {
      const selected = myLectures.find((l) => l.lectureId === selectedLectureId);
      if (selected) return [selected, ...base];
    }
    return base;
  }, [filterMode, currentlyAvailableLectures, myLectures, selectedLectureId]);

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');

  const displayedLectures = useMemo(() => {
    if (!quickFilter.trim()) return candidateLectures;
    const q = quickFilter.toLowerCase().trim();
    return candidateLectures.filter((l) => {
      const combined = `${l.lectureId} ${l.lectureName} ${l.startTime} ${l.endTime} ${l.studyType} ${l.weekDays} ${l.group} ${l.college} ${l.university} ${l.stage} ${l.lecturerName} ${l.teacherEmail} ${l.lecturePlace}`.toLowerCase();
      return combined.includes(q);
    });
  }, [candidateLectures, quickFilter]);

  // تغيير المحاضرة يدوياً وتحديث الحالة لجميع الطلاب المرتبطين بها فوراً
  const handleSelectLecture = (newId: string) => {
    setManualSelectedId(newId);
    const chosen = myLectures.find((l) => l.lectureId === newId);
    if (chosen) {
      const freshOtp = chosen.activeOtpCode || Math.floor(100000 + Math.random() * 900000).toString();
      onUpdateLecture({
        ...chosen,
        isSessionActive: true,
        activeOtpCode: freshOtp,
      });
      sounds.playClick();
    }
  };

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isEditLectureModalOpen, setIsEditLectureModalOpen] = useState(false);

  // Advanced Smart QR: 10-second auto-rotate & Fullscreen
  const [isAutoRotateQR, setIsAutoRotateQR] = useState(false);
  const [rotateCountdown, setRotateCountdown] = useState(10);
  const [isFullscreenQR, setIsFullscreenQR] = useState(false);

  const activeLecture = useMemo(() => {
    return myLectures.find((l) => l.lectureId === selectedLectureId) || myLectures[0];
  }, [myLectures, selectedLectureId]);

  // Generate QR Code for the active dynamic OTP
  React.useEffect(() => {
    if (activeLecture?.activeOtpCode) {
      QRCode.toDataURL(
        JSON.stringify({
          lectureId: activeLecture.lectureId,
          lectureName: activeLecture.lectureName,
          otp: activeLecture.activeOtpCode,
          place: activeLecture.lecturePlace,
          timestamp: Date.now(),
        }),
        { width: 360, margin: 1 }
      )
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [activeLecture?.activeOtpCode, activeLecture?.lectureId, activeLecture?.lectureName, activeLecture?.lecturePlace]);

  // 10-Second Auto-Rotating QR Code Timer
  React.useEffect(() => {
    if (!isAutoRotateQR || !activeLecture?.isSessionActive) {
      setRotateCountdown(10);
      return;
    }

    const interval = setInterval(() => {
      setRotateCountdown((prev) => {
        if (prev <= 1) {
          // Regenerate new OTP
          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          onUpdateLecture({
            ...activeLecture,
            activeOtpCode: newOtp,
          });
          sounds.tap();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoRotateQR, activeLecture, onUpdateLecture]);

  // Attendance records for this specific lecture (restricted to this lecturer's section)
  const lectureAttendees = useMemo(() => {
    if (!activeLecture) return [];
    return attendanceRecords.filter((r) => 
      r.lectureName === activeLecture.lectureName &&
      (!activeLecture.stage || !r.stage || r.stage === activeLecture.stage) &&
      (!activeLecture.group || !r.group || r.group === activeLecture.group)
    );
  }, [attendanceRecords, activeLecture]);

  // Stats for this lecture
  const lectureStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let excused = 0;

    lectureAttendees.forEach((r) => {
      if (r.attendanceStatus === 'حاضر') present++;
      else if (r.attendanceStatus === 'متأخر') late++;
      else if (r.attendanceStatus === 'معذور') excused++;
    });

    return { total: lectureAttendees.length, present, late, excused };
  }, [lectureAttendees]);

  // Toggle active attendance session
  const handleToggleSession = () => {
    if (!activeLecture) return;
    const nextState = !activeLecture.isSessionActive;
    onUpdateLecture({
      ...activeLecture,
      isSessionActive: nextState,
    });
    if (nextState) sounds.playSuccessChime();
    else sounds.playWarningChime();
  };

  // Generate new Dynamic OTP code (prevents sharing code to absent students)
  const handleRegenerateOtp = () => {
    if (!activeLecture) return;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    onUpdateLecture({
      ...activeLecture,
      activeOtpCode: newOtp,
    });
    sounds.playClick();
  };

  // Update hall location and radius
  const handleSaveLocationSettings = (lat: number, lng: number, radius: number) => {
    if (!activeLecture) return;
    onUpdateLecture({
      ...activeLecture,
      targetLatitude: lat,
      targetLongitude: lng,
      allowedRadiusMeters: radius,
    });
    setShowLocationModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Lecturer Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                بوابة الأستاذ المحاضر: {currentUser.name}
              </h2>
              <p className="text-xs text-slate-500">
                التحكم الكامل بمحاضراتك، إطلاق جلسات الحضور بالـ GPS، وعرض وتأكيد حضور الطلاب.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>مشاركة التطبيق بالقاعة (QR)</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeLecture) {
                exportSingleLectureExcel(activeLecture, attendanceRecords);
                sounds.success();
              }
            }}
            disabled={!activeLecture}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap ${
              activeLecture ? 'text-white bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="تنزيل كشف المحاضرة (Excel) بتسمية تلقائية وأعمدة مخصصة"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تنزيل كشف المحاضرة (Excel)</span>
          </button>

          <button
            onClick={() => {
              if (activeLecture) {
                exportSingleLecturePDF(activeLecture, attendanceRecords);
                sounds.success();
              }
            }}
            disabled={!activeLecture}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap ${
              activeLecture ? 'text-white bg-rose-600 hover:bg-rose-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="تصدير تقرير الحضور كملف PDF مهيكل واحترافي بشعار الجامعة"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير تقرير المحاضرة (PDF)</span>
          </button>

          <button
            onClick={() => activeLecture && exportAttendanceToCSV(lectureAttendees, `${activeLecture.lectureName || 'Lecture'}_Attendance.csv`)}
            disabled={!activeLecture}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              activeLecture ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title="تصدير بصيغة CSV لـ AppSheet و Google Sheets معزز بترميز UTF-8 BOM وتوجيه الأعمدة"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV سحابي</span>
          </button>

          <button
            onClick={() => setIsEditLectureModalOpen(true)}
            disabled={!activeLecture}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors ${
              activeLecture ? 'text-white bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="تعديل مواعيد وقاعة ونطاق المحاضرة التي كلفك بها الأدمن"
          >
            <Edit3 className="w-4 h-4" />
            <span>تعديل بيانات المحاضرة المكلف بها</span>
          </button>
        </div>
      </div>

      {myLectures.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لا توجد محاضرات مسندة إليك حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            تقتصر رؤية وتعديل المحاضرات في واجهة الأستاذ على محاضراته الخاصة فقط بناءً على البريد الإلكتروني (<span className="font-mono font-bold text-slate-700">{currentUser.email}</span>). يرجى مراجعة إدارة الكلية لإسناد المحاضرات لجدولك.
          </p>
        </div>
      ) : (
        <>
          {/* Dynamic Lecture Dropdown - Showing ONLY Lecture Name with 13-columns synchronization */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="lecturer-select-lecture" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>المحاضرة المعتمدة (تحديد ديناميكي مع إمكانية التبديل اليدوي):</span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  اسم المحاضرة فقط
                </span>
              </label>

              {/* Filter Tabs & Modal trigger */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('available');
                      sounds.tap();
                    }}
                    className={`px-3 py-1 rounded-lg transition-all text-[11px] ${
                      filterMode === 'available'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    المتاحة حالياً ({currentlyAvailableLectures.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('all');
                      sounds.tap();
                    }}
                    className={`px-3 py-1 rounded-lg transition-all text-[11px] ${
                      filterMode === 'all'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    جميع محاضراتي ({myLectures.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSelectionModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  <span>جدول الـ 13 معيار 📋</span>
                </button>
              </div>
            </div>

            {/* Quick Filter across 13 columns for professor */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="تصفية سريعة في المحاضرات: الرمز، الاسم، التوقيت، القاعة، الشعبة، المرحلة، نوع الدراسة..."
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              {quickFilter && (
                <button
                  type="button"
                  onClick={() => setQuickFilter('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  إلغاء
                </button>
              )}
            </div>

            {/* Dynamic Dropdown showing ONLY the lecture name */}
            <div className="relative">
              <select
                id="lecturer-select-lecture"
                value={selectedLectureId}
                onChange={(e) => handleSelectLecture(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/60 border-2 border-blue-400/80 text-slate-900 text-sm font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer shadow-xs"
              >
                {displayedLectures.map((lec) => (
                  <option key={lec.lectureId} value={lec.lectureId}>
                    {lec.lectureName}
                  </option>
                ))}
                {displayedLectures.length === 0 && (
                  <option value="" disabled>
                    لا توجد محاضرات مطابقة
                  </option>
                )}
              </select>
            </div>

            {/* Live Student State Sync & 13 Columns Taken into Account */}
            {activeLecture && (
              <div className="bg-slate-50 border border-blue-100 rounded-xl p-3.5 space-y-2.5 text-xs">
                {/* Instant Student Synchronization Notice */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    <span className="font-bold text-slate-800">حالة الطلاب المرتبطين بالمحاضرة:</span>
                    <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[11px]">
                      مزامنة فورية نشطة ✓
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium">
                    المحاضرة ملقنة ومجمدة كـ <span className="font-bold text-amber-700">(Read-Only)</span> لدى طلاب {activeLecture.stage} - شعبة ({activeLecture.group})
                  </span>
                </div>

                {/* 13 Table Columns Taken Into Account Display */}
                <div>
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>متعلقات المحاضرة المعتمدة في الجدول الدراسي (المعايير الـ 13 المطبقة تلقائياً):</span>
                    <span className="text-slate-400 font-normal">يظهر في القائمة المنسدلة اسم المحاضرة فقط لسهولة الاستخدام</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Lecture ID:</span>
                      <span className="font-mono font-bold text-blue-700">{activeLecture.lectureId}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Lecture name:</span>
                      <span className="font-bold text-slate-900 truncate block">{activeLecture.lectureName}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Start - End Time:</span>
                      <span className="font-mono font-bold text-slate-800">{activeLecture.startTime.slice(0, 5)} - {activeLecture.endTime.slice(0, 5)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">نوع الدراسة:</span>
                      <span className="font-semibold text-slate-800">{activeLecture.studyType}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">أيام الأسبوع:</span>
                      <span className="font-semibold text-slate-800">{activeLecture.weekDays}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Group:</span>
                      <span className="font-bold text-blue-700">{activeLecture.group}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">College:</span>
                      <span className="text-slate-700 truncate block">{activeLecture.college}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">University:</span>
                      <span className="text-slate-700 truncate block">{activeLecture.university}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Stage:</span>
                      <span className="font-semibold text-slate-800">{activeLecture.stage}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Lecturer name:</span>
                      <span className="font-bold text-slate-900 truncate block">{activeLecture.lecturerName}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-[10px]">Teacher Email:</span>
                      <span className="font-mono text-[10px] text-slate-600 truncate block">{activeLecture.teacherEmail}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 shadow-2xs">
                      <span className="text-emerald-700 block text-[10px] font-bold">lecture place:</span>
                      <span className="font-bold text-emerald-900 truncate block">{activeLecture.lecturePlace}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>💡 ملاحظة: عند تغيير المحاضرة يدوياً من القائمة أعلاه، يتم فوراً فتح جلسة المحاضرة وتحديث الحالة وتجميد الحقول لدى جميع الطلاب المرتبطين بها.</span>
                  <button
                    type="button"
                    onClick={() => setIsSelectionModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline shrink-0 mr-2"
                  >
                    عرض الجدول الكامل (13 عمود) ←
                  </button>
                </p>
              </div>
            )}
          </div>

      {activeLecture && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Lecture Control Console */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <span>غرفة التحكم بجلسة التحضير</span>
              </h3>

              <button
                onClick={handleToggleSession}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${
                  activeLecture.isSessionActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {activeLecture.isSessionActive ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>إغلاق جلسة التحضير</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>بدء واستقبال الحضور الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Lecture Live Summary Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl space-y-2 text-xs">
              <div className="font-extrabold text-blue-900 flex items-center justify-between">
                <span>ملخص المحاضرة والإحصائيات التلقائية:</span>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">مباشر 📊</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">الحاضرون</span>
                  <span className="font-black text-emerald-700 text-sm">{lectureStats.present + lectureStats.late}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">المعذورون</span>
                  <span className="font-black text-purple-700 text-sm">{lectureStats.excused}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">إجمالي الحضور</span>
                  <span className="font-black text-blue-900 text-sm">{lectureStats.total}</span>
                </div>
              </div>
            </div>

            {/* Medical Excuses Inbox for Lecturer */}
            {excuseRequests && excuseRequests.length > 0 && (
              <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-xl space-y-3 text-xs">
                <div className="font-extrabold text-purple-950 flex items-center justify-between">
                  <span>طلبات الأعذار الطبية والتقارير ({excuseRequests.filter(e => e.status === 'pending').length} معلق):</span>
                  <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[10px]">أعذار الطلبة 📄</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {excuseRequests.map((exc) => (
                    <div key={exc.id} className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{exc.studentName} ({exc.studentCode})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exc.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          exc.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {exc.status === 'accepted' ? 'مقبول (معذور)' : exc.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px] bg-slate-50 p-2 rounded">{exc.reason}</p>
                      {exc.attachmentUrl && (
                        <div>
                          <a href={exc.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-[10px]">
                            عرض المرفق المرفوع (صورة / تقرير) 📎
                          </a>
                        </div>
                      )}
                      {exc.status === 'pending' && onUpdateExcuseRequest && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateExcuseRequest({ ...exc, status: 'accepted' });
                              sounds.playSuccessChime();
                            }}
                            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs"
                          >
                            قبول العذر وتحويل الغياب لمعذور ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateExcuseRequest({ ...exc, status: 'rejected' });
                              sounds.playWarningChime();
                            }}
                            className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs"
                          >
                            رفض ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lecture Meta - 13 Standard AppSheet Columns */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>المعايير الـ 13 للمحاضرة الحالية المعتمدة:</span>
                </span>
                <button
                  onClick={() => setIsEditLectureModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>تعديل</span>
                </button>
              </div>

              {/* 13 Key-Values Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">1. Lecture ID:</span>
                  <span className="font-mono font-bold text-blue-700">{activeLecture.lectureId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">2. Lecture name:</span>
                  <span className="font-bold text-slate-900 truncate block">{activeLecture.lectureName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">3. Start Time:</span>
                  <span className="font-mono font-bold text-slate-800">{activeLecture.startTime.slice(0, 5)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">4. End Time:</span>
                  <span className="font-mono font-bold text-slate-800">{activeLecture.endTime.slice(0, 5)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">5. نوع الدراسة:</span>
                  <span className="font-semibold text-slate-800">{activeLecture.studyType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">6. أيام الأسبوع:</span>
                  <span className="font-semibold text-slate-800">{activeLecture.weekDays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">7. Group:</span>
                  <span className="font-bold text-blue-700">{activeLecture.group}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">8. College:</span>
                  <span className="text-slate-700 truncate block">{activeLecture.college}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">9. University:</span>
                  <span className="text-slate-700 truncate block">{activeLecture.university}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">10. Stage:</span>
                  <span className="font-semibold text-slate-800">{activeLecture.stage}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">11. Lecturer name:</span>
                  <span className="font-bold text-slate-900">{activeLecture.lecturerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">12. Teacher Email:</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate block">{activeLecture.teacherEmail}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block text-[10px]">13. lecture place:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                    {activeLecture.lecturePlace}
                  </span>
                </div>
              </div>

              {/* Quick Biometric Toggle by Professor */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold flex items-center gap-1.5 text-[11px]">
                  <ScanFace className="w-3.5 h-3.5 text-purple-600" />
                  <span>بصمة الوجه الرقمية:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !activeLecture.requireFaceBiometric;
                    onUpdateLecture({
                      ...activeLecture,
                      requireFaceBiometric: nextVal,
                    });
                    if (nextVal) sounds.success();
                    else sounds.tap();
                  }}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                    activeLecture.requireFaceBiometric
                      ? 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold shadow-xs'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="التحكم باشتراط بصمة الوجه للطلاب في هذه المحاضرة"
                >
                  {activeLecture.requireFaceBiometric ? 'مفعلة وإلزامية للطلاب ✓' : 'اختيارية / معطلة'}
                </button>
              </div>

              {/* Quick Location Verification Toggle by Professor */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold flex items-center gap-1.5 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>التحقق الجغرافي (GPS):</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = activeLecture.requireLocationVerification === false ? true : false;
                    onUpdateLecture({
                      ...activeLecture,
                      requireLocationVerification: nextVal,
                    });
                    if (nextVal) sounds.success();
                    else sounds.tap();
                  }}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                    activeLecture.requireLocationVerification !== false
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold shadow-xs'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="التحكم باشتراط التحقق الجغرافي للطلاب في هذه المحاضرة"
                >
                  {activeLecture.requireLocationVerification !== false ? 'مفعل وإلزامي للطلاب ✓' : 'معطل / اختياري'}
                </button>
              </div>
            </div>

            {/* Dynamic OTP Screen for Class Display */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-4 rounded-xl text-center space-y-3 shadow-md border border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-[11px] text-blue-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>كود الحضور المؤقت (OTP & QR) للقاعة:</span>
                </span>

                <button
                  onClick={() => setIsFullscreenQR(true)}
                  className="text-[11px] text-blue-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-600 transition-colors"
                  title="تكبير الشاشة للعرض على جهاز العرض (البروجكتر)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>شاشة البروجكتر</span>
                </button>
              </div>
              
              <div className="text-3xl font-extrabold font-mono tracking-widest text-emerald-400 bg-black/50 py-2.5 rounded-lg border border-slate-700 shadow-inner">
                {activeLecture.activeOtpCode || '------'}
              </div>

              {qrDataUrl && (
                <div className="bg-white p-2.5 rounded-xl inline-block shadow-lg relative group">
                  <img src={qrDataUrl} alt="OTP QR" className="w-40 h-40 mx-auto object-contain" />
                  <div className="text-[10px] text-slate-800 font-bold font-mono mt-1">
                    امسح بالكاميرا للتحضير الفوري
                  </div>
                </div>
              )}

              {/* 10-Second Auto-Rotate Switcher & Countdown Bar */}
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoRotateQR}
                      onChange={(e) => {
                        setIsAutoRotateQR(e.target.checked);
                        if (e.target.checked) sounds.success();
                      }}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-600"
                    />
                    <span>توليد تلقائي متغير كل 10 ثوانٍ (Dynamic QR)</span>
                  </label>
                  
                  {isAutoRotateQR && (
                    <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 animate-pulse" />
                      <span>{rotateCountdown}ث</span>
                    </span>
                  )}
                </div>

                {isAutoRotateQR && (
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${(rotateCountdown / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerateOtp}
                  className="flex-1 py-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>توليد يدوي جديد</span>
                </button>
              </div>
            </div>

            {/* Geofence Hall Location Config */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>نطاق القاعة الجغرافي (GPS Geofence)</span>
                </span>
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  تعديل
                </button>
              </div>

              <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                <span>الإحداثيات:</span>
                <span className="font-mono">{activeLecture.targetLatitude.toFixed(4)}, {activeLecture.targetLongitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>نصف قطر السماح:</span>
                <span className="font-mono font-bold text-slate-800">{activeLecture.allowedRadiusMeters} متر</span>
              </div>
            </div>

          </div>

          {/* Student Roster Real-time Attendees List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>كشف الحضور المباشر للمحاضرة ({lectureAttendees.length} طالب)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  سجل حي موثق بالوقت وموقع التواجد ودقائق التأخير.
                </p>
              </div>

              {/* Mini KPIs & WhatsApp Broadcast */}
              <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md font-bold">
                  حاضر: {lectureStats.present}
                </span>
                <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded-md font-bold">
                  متأخر: {lectureStats.late}
                </span>
                
                {activeLecture && (
                  <button
                    onClick={() => {
                      const msg = 
                        `*تقرير كشف حضور المحاضرة - ${activeLecture.college}*\n\n` +
                        `المحاضرة: *${activeLecture.lectureName}*\n` +
                        `المحاضر: *${activeLecture.lecturerName}*\n` +
                        `المرحلة: ${activeLecture.stage} (${activeLecture.group})\n` +
                        `القاعة: ${activeLecture.lecturePlace}\n` +
                        `التاريخ: ${new Date().toLocaleDateString('ar-IQ')}\n\n` +
                        `عدد الحضور الفعلي: *${lectureStats.present} طالب*\n` +
                        `عدد المتأخرين: *${lectureStats.late} طالب*\n\n` +
                        `تم التوثيق الذكي عبر نظام الحضور بالـ GPS و QR.`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-sans text-xs font-bold transition-colors shadow-xs"
                    title="مشاركة ملخص الحضور مع رئيس القسم أو المشرف عبر واتساب"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>واتساب</span>
                  </button>
                )}
              </div>
            </div>

            {/* Attendee Rows */}
            <div className="max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              {lectureAttendees.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>بانتظار تسجيل أول طالب في هذه المحاضرة...</p>
                  <p className="text-[11px] text-slate-400">تأكد من فتح جلسة التحضير لعرض الكود للطلاب.</p>
                </div>
              ) : (
                lectureAttendees.map((att) => (
                  <div key={att.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{att.name}</span>
                        <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {att.studentCode}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">({att.group})</span>
                        {(() => {
                          const absence = calculateStudentAbsence(att.email, att.studentCode, lectures, attendanceRecords);
                          if (absence.isExceeded) {
                            return (
                              <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-xs" title={`تجاوز نسبة الغياب ${absence.absencePercentage}%`}>
                                <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" />
                                <span>⚠️ تحذير غياب {absence.absencePercentage}%</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{att.timestamp}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-700">{att.location}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-purple-700">{att.deviceId}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <select
                        value={att.attendanceStatus}
                        onChange={(e) => {
                          onUpdateAttendanceRecord({
                            ...att,
                            attendanceStatus: e.target.value as AttendanceStatus,
                          });
                        }}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                          att.attendanceStatus === 'حاضر'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : att.attendanceStatus === 'متأخر'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="حاضر">حاضر</option>
                        <option value="متأخر">متأخر</option>
                        <option value="غائب">غائب</option>
                        <option value="معذور">معذور</option>
                      </select>

                      {att.delayMinutes > 0 && (
                        <span className="text-[11px] font-mono text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          +{att.delayMinutes} د
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

      {/* Edit Assigned Lecture Modal */}
      {activeLecture && (
        <EditAssignedLectureModal
          isOpen={isEditLectureModalOpen}
          onClose={() => setIsEditLectureModalOpen(false)}
          lecture={activeLecture}
          onSave={onUpdateLecture}
        />
      )}

      {/* Fullscreen Projector Modal for Lecture Hall Display */}
      {isFullscreenQR && activeLecture && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setIsFullscreenQR(false)}
            className="absolute top-6 left-6 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <Minimize2 className="w-5 h-5" />
            <span>خروج من وضع البروجكتر</span>
          </button>

          <div className="max-w-xl w-full space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
                نظام تسجيل الحضور الذكي للقاعة
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
                {activeLecture.lectureName}
              </h1>
              <p className="text-sm text-slate-300">
                المحاضر: {activeLecture.lecturerName} · {activeLecture.lecturePlace}
              </p>
            </div>

            {/* Giant OTP */}
            <div className="bg-black/60 border-2 border-emerald-500/50 p-6 rounded-3xl shadow-2xl">
              <span className="text-xs text-slate-400 block mb-2 font-bold">
                رمز التحضير المباشر (OTP):
              </span>
              <div className="text-6xl sm:text-7xl font-mono font-black tracking-widest text-emerald-400">
                {activeLecture.activeOtpCode || '------'}
              </div>
            </div>

            {/* Giant QR Code */}
            {qrDataUrl && (
              <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
                <img src={qrDataUrl} alt="Fullscreen QR" className="w-64 h-64 sm:w-72 sm:h-72 mx-auto object-contain" />
              </div>
            )}

            {/* 10-Second Countdown in Fullscreen */}
            {isAutoRotateQR && (
              <div className="space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-xs text-slate-300 font-bold font-mono">
                  <span>يتغير الكود تلقائياً خلال:</span>
                  <span className="text-emerald-400">{rotateCountdown} ثوانٍ</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(rotateCountdown / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">
              امسح الكود عبر تطبيق حضور الطلاب بهاتفك — يشترط التواجد الفعلي داخل نطاق القاعة الجغرافي (GPS).
            </p>
          </div>
        </div>
      )}

      {/* 13-Columns Lecture Selection Modal for Lecturer */}
      <LectureSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        lectures={myLectures}
        selectedLectureId={selectedLectureId}
        onSelectLecture={(lec) => {
          handleSelectLecture(lec.lectureId);
        }}
        title="اختيار وتحديد المحاضرة (محاضراتي المكلف بها - 13 معيار)"
        userRole="lecturer"
        autoDetectedLectureId={autoDetectedLectureId}
      />

        </>
      )}

    </div>
  );
};
