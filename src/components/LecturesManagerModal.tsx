import React, { useState, useEffect } from 'react';
import { Lecture, StudyType, UserAccount } from '../types/attendance';
import { DEFAULT_CAMPUS_COORDS } from '../utils/geo';
import { BookOpen, X, Save, GraduationCap, MapPin, UserCheck } from 'lucide-react';

interface LecturesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLecture: (lecture: Lecture) => void;
  currentUser: UserAccount;
  lecturers?: UserAccount[];
  defaultCollege?: string;
  defaultUniversity?: string;
}

export const LecturesManagerModal: React.FC<LecturesManagerModalProps> = ({
  isOpen,
  onClose,
  onSaveLecture,
  currentUser,
  lecturers = [],
  defaultCollege = 'كلية التمريض',
  defaultUniversity = 'جامعة بابل',
}) => {
  const [lectureId, setLectureId] = useState('');
  const [lectureName, setLectureName] = useState('');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:30');
  const [studyType, setStudyType] = useState<StudyType>('صباحي');
  const [weekDays, setWeekDays] = useState('الأحد، الثلاثاء');
  const [group, setGroup] = useState('Group A');
  const [college, setCollege] = useState(defaultCollege);
  const [university, setUniversity] = useState(defaultUniversity);
  const [stage, setStage] = useState('المرحلة الثانية');
  
  // Selected Lecturer from list or custom
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('custom');
  const [lecturerName, setLecturerName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [lecturePlace, setLecturePlace] = useState('مدرج ابن الهيثم (قاعة 101)');
  const [error, setError] = useState<string | null>(null);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      setLectureId(`LEC-${Date.now().toString().slice(-4)}`);
      setCollege(defaultCollege);
      setUniversity(defaultUniversity);

      // Default to first registered lecturer if available
      if (lecturers.length > 0) {
        setSelectedLecturerId(lecturers[0].id);
        setLecturerName(lecturers[0].name);
        setTeacherEmail(lecturers[0].email);
      } else {
        setSelectedLecturerId('custom');
        setLecturerName('عبدالله علاء');
        setTeacherEmail('hla478983@gmail.com');
      }
    }
  }, [isOpen, lecturers, defaultCollege, defaultUniversity]);

  if (!isOpen) return null;

  const handleLecturerSelect = (id: string) => {
    setSelectedLecturerId(id);
    if (id === 'custom') {
      setLecturerName('');
      setTeacherEmail('');
    } else {
      const found = lecturers.find((l) => l.id === id);
      if (found) {
        setLecturerName(found.name);
        setTeacherEmail(found.email);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureName.trim()) {
      setError('يرجى إدخال اسم المحاضرة');
      return;
    }
    if (!lecturerName.trim() || !teacherEmail.trim()) {
      setError('يرجى تحديد الأستاذ المكلف وإيميله الرسمي');
      return;
    }
    if (!lecturePlace.trim()) {
      setError('يرجى إدخال مكان المحاضرة / القاعة');
      return;
    }

    const newLecture: Lecture = {
      lectureId: lectureId.trim(),
      lectureName: lectureName.trim(),
      startTime,
      endTime,
      studyType,
      weekDays: weekDays.trim(),
      group: group.trim(),
      college: college.trim(),
      university: university.trim(),
      stage: stage.trim(),
      lecturerName: lecturerName.trim(),
      teacherEmail: teacherEmail.trim().toLowerCase(),
      lecturePlace: lecturePlace.trim(),
      targetLatitude: DEFAULT_CAMPUS_COORDS.latitude,
      targetLongitude: DEFAULT_CAMPUS_COORDS.longitude,
      allowedRadiusMeters: 100,
      activeOtpCode: Math.floor(100000 + Math.random() * 900000).toString(),
      isSessionActive: true,
    };

    onSaveLecture(newLecture);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                إضافة محاضرة جديدة وتكليف أستاذ بها
              </h3>
              <p className="text-xs text-slate-500">
                صلاحية خاصة بالادمن فقط — تكليف الأستاذ وإسناد المحاضرة لحسابه
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Lecture ID & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lecture ID: *</label>
              <input
                type="text"
                required
                value={lectureId}
                onChange={(e) => setLectureId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Lecture name: *</label>
              <input
                type="text"
                required
                placeholder="مثال: تمريض البالغين - نظري"
                value={lectureName}
                onChange={(e) => setLectureName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Time & Study Type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Time: *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Time: *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">نوع الدراسة: *</label>
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
              <label className="block font-semibold text-slate-700 mb-1">أيام الأسبوع: *</label>
              <input
                type="text"
                required
                placeholder="الأحد، الثلاثاء"
                value={weekDays}
                onChange={(e) => setWeekDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
              />
            </div>
          </div>

          {/* Group, Stage, Place */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Group: *</label>
              <input
                type="text"
                required
                placeholder="Group A"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stage: *</label>
              <input
                type="text"
                required
                placeholder="المرحلة الثانية"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">lecture place: *</label>
              <input
                type="text"
                required
                placeholder="مدرج ابن الهيثم (قاعة 101)"
                value={lecturePlace}
                onChange={(e) => setLecturePlace(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-blue-900"
              />
            </div>
          </div>

          {/* Lecturer Assignment Section */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-blue-950 text-xs">
                تكليف الأستاذ المحاضر (سيتمكن هذا الأستاذ فقط من التحكم بهذه المحاضرة):
              </span>
            </div>

            {lecturers.length > 0 && (
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  اختر من قائمة الأساتذة المسجلين في الكلية:
                </label>
                <select
                  value={selectedLecturerId}
                  onChange={(e) => handleLecturerSelect(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {lecturers.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      {lec.name} ({lec.email})
                    </option>
                  ))}
                  <option value="custom">-- أستاذ آخر (إدخال يدوي) --</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lecturer name: *</label>
                <input
                  type="text"
                  required
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  placeholder="اسم الأستاذ"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teacher Email: *</label>
                <input
                  type="email"
                  required
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="البريد الإلكتروني للأستاذ"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono text-slate-800"
                />
              </div>
            </div>
          </div>

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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتكليف المحاضرة</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
