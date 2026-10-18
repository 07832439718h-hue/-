import React, { useState } from 'react';
import { Lecture, StudyType } from '../types/attendance';
import { sounds } from '../utils/audio';
import { 
  Edit3, 
  X, 
  Save, 
  MapPin, 
  Compass, 
  Clock, 
  Calendar, 
  Layers, 
  Building,
  CheckCircle,
  AlertCircle,
  ScanFace
} from 'lucide-react';

interface EditAssignedLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lecture: Lecture | null;
  onSave: (updated: Lecture) => void;
}

export const EditAssignedLectureModal: React.FC<EditAssignedLectureModalProps> = ({
  isOpen,
  onClose,
  lecture,
  onSave,
}) => {
  if (!isOpen || !lecture) return null;

  const [lectureName, setLectureName] = useState(lecture.lectureName);
  const [startTime, setStartTime] = useState(lecture.startTime);
  const [endTime, setEndTime] = useState(lecture.endTime);
  const [studyType, setStudyType] = useState<StudyType>(lecture.studyType);
  const [weekDays, setWeekDays] = useState(lecture.weekDays);
  const [group, setGroup] = useState(lecture.group);
  const [stage, setStage] = useState(lecture.stage);
  const [lecturePlace, setLecturePlace] = useState(lecture.lecturePlace);
  const [targetLat, setTargetLat] = useState(lecture.targetLatitude);
  const [targetLng, setTargetLng] = useState(lecture.targetLongitude);
  const [radiusMeters, setRadiusMeters] = useState(lecture.allowedRadiusMeters || 100);
  const [requireFaceBiometric, setRequireFaceBiometric] = useState(lecture.requireFaceBiometric ?? false);
  const [requireLocationVerification, setRequireLocationVerification] = useState(lecture.requireLocationVerification ?? true);
  const [attendanceWindowMinutes, setAttendanceWindowMinutes] = useState(lecture.attendanceWindowMinutes || 15);

  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    setIsCapturingGps(true);
    setGpsMessage('جاري تحديد إحداثيات موقعك الحالي عبر الـ GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTargetLat(Number(pos.coords.latitude.toFixed(6)));
        setTargetLng(Number(pos.coords.longitude.toFixed(6)));
        setIsCapturingGps(false);
        setGpsMessage(`تم التقاط إحداثيات القاعة بدقة ${Math.round(pos.coords.accuracy)} متر ✓`);
        sounds.playClick();
      },
      (err) => {
        setIsCapturingGps(false);
        setGpsMessage(`تعذر قراءة الموقع: ${err.message}. يرجى تفعيل الـ GPS وإعطاء الإذن للمتصفح.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lectureName.trim()) {
      setError('يرجى إدخال اسم المحاضرة.');
      return;
    }

    if (!lecturePlace.trim()) {
      setError('يرجى إدخال مكان المحاضرة أو القاعة.');
      return;
    }

    const updated: Lecture = {
      ...lecture,
      lectureName: lectureName.trim(),
      startTime,
      endTime,
      studyType,
      weekDays: weekDays.trim(),
      group: group.trim(),
      stage: stage.trim(),
      lecturePlace: lecturePlace.trim(),
      targetLatitude: targetLat,
      targetLongitude: targetLng,
      allowedRadiusMeters: Number(radiusMeters) || 100,
      requireFaceBiometric: Boolean(requireFaceBiometric),
      requireLocationVerification: Boolean(requireLocationVerification),
      attendanceWindowMinutes: Number(attendanceWindowMinutes) || 15,
    };

    onSave(updated);
    sounds.playSuccessChime();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                تعديل بيانات المحاضرة المكلف بها
              </h3>
              <p className="text-xs text-slate-500">
                المحاضرة: <span className="font-bold text-blue-900">{lecture.lectureName}</span> ({lecture.lectureId})
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

        {/* Assigned Note */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">محاضرة مسندة لك رسمياً من قبل إدارة الكلية</p>
            <p className="text-[11px] text-blue-700">
              المحاضر المعتمد: {lecture.lecturerName} ({lecture.teacherEmail}). يمكنك تعديل المواعيد، القاعة، ونطاق الـ GPS.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Lecture Name & Place */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                اسم المحاضرة: *
              </label>
              <input
                type="text"
                required
                value={lectureName}
                onChange={(e) => setLectureName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                مكان المحاضرة / القاعة: *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: مدرج ابن الهيثم (قاعة 101)"
                value={lecturePlace}
                onChange={(e) => setLecturePlace(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Time & Study Type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                وقت البدء (Start): *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                وقت الانتهاء (End): *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                نوع الدراسة: *
              </label>
              <select
                value={studyType}
                onChange={(e) => setStudyType(e.target.value as StudyType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
              >
                <option value="صباحي">صباحي</option>
                <option value="مسائي">مسائي</option>
                <option value="مدمج">مدمج</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                أيام الأسبوع: *
              </label>
              <input
                type="text"
                required
                value={weekDays}
                onChange={(e) => setWeekDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold"
              />
            </div>
          </div>

          {/* Attendance Window Lock Time */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  قفل وقت التسجيل التلقائي (Attendance Window Lock)
                </h4>
                <p className="text-[11px] text-amber-800">
                  حدد مدة زمنية بالدقائق مسموحة لتسجيل الحضور بعد بدء المحاضرة (مثلاً أول 15 دقيقة)، بعدها تُغلق واجهة التسجيل تلقائياً.
                </p>
              </div>

              <div className="w-32">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={attendanceWindowMinutes}
                  onChange={(e) => setAttendanceWindowMinutes(Number(e.target.value))}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2 text-center font-mono font-bold text-amber-900"
                />
              </div>
            </div>
          </div>

          {/* Stage & Group */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الشعبة (Group): *
              </label>
              <input
                type="text"
                required
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                المرحلة الدراسية: *
              </label>
              <input
                type="text"
                required
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold"
              />
            </div>
          </div>

          {/* Geolocation & Geofence Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>إحداثيات القاعة ونطاق الـ GPS المسموح به للطلاب</span>
              </span>

              <button
                type="button"
                onClick={handleCaptureCurrentLocation}
                disabled={isCapturingGps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 text-[11px]"
              >
                <Compass className={`w-3.5 h-3.5 ${isCapturingGps ? 'animate-spin' : ''}`} />
                <span>{isCapturingGps ? 'جاري الالتقاط...' : 'التقاط موقعي الحالي بالقاعة'}</span>
              </button>
            </div>

            {gpsMessage && (
              <div className="p-2 rounded-lg bg-blue-100/70 text-blue-900 text-[11px] font-medium">
                {gpsMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  خط العرض (Latitude):
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={targetLat}
                  onChange={(e) => setTargetLat(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  خط الطول (Longitude):
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={targetLng}
                  onChange={(e) => setTargetLng(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  نصف قطر السماح (متر):
                </label>
                <input
                  type="number"
                  min="20"
                  max="1000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold text-blue-700"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              * لن يتمكن الطالب من تسجيل الحضور إلا إذا تواجد جغرافياً ضمن هذا النطاق المسموح به.
            </p>
          </div>

          {/* Face ID Biometric Toggle for Course Professor */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <ScanFace className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950">
                    بصمة الوجه الرقمية (Face ID Biometric)
                  </h4>
                  <p className="text-[11px] text-purple-700">
                    خاصية اختيارية يتحكم بها أستاذ المادة لإلزام الطلاب بمسح بصمة الوجه لتأكيد الحضور
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireFaceBiometric}
                  onChange={(e) => setRequireFaceBiometric(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            
            <p className="text-[10px] text-purple-800 font-medium">
              {requireFaceBiometric 
                ? '✓ البصمة مفعلة: لن يتمكن الطالب من تسجيل الحضور إلا بعد مسح وتأكيد بصمة الوجه.'
                : '○ البصمة معطلة: يمكن للطالب تسجيل الحضور بنطاق الـ GPS ورمز القاعة دون اشتراط بصمة الوجه.'}
            </p>
          </div>

          {/* Location Verification Toggle for Course Professor */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    التحقق من الموقع الجغرافي للطلاب (GPS Geofence)
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    صلاحية الأستاذ: تحديد ما إذا كان يجب مطالبة الطالب بالتحقق من موقعه الجغرافي داخل القاعة أم إلغاء المطالبة
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireLocationVerification}
                  onChange={(e) => setRequireLocationVerification(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            
            <p className="text-[10px] text-emerald-800 font-medium">
              {requireLocationVerification 
                ? '✓ التحقق الجغرافي مفعل: يشترط تواجد الطالب جغرافياً ضمن نطاق القاعة لتسجيل الحضور.'
                : '○ التحقق الجغرافي معطل: يمكن للطالب تسجيل الحضور دون تقييد بالموقع الجغرافي.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات على المحاضرة</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
