import React, { useState, useMemo } from 'react';
import { Lecture } from '../types/attendance';
import { sounds } from '../utils/audio';
import { 
  BookOpen, 
  X, 
  Search, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  GraduationCap, 
  Building, 
  Calendar, 
  Sparkles,
  Lock,
  ArrowRight,
  Filter
} from 'lucide-react';

interface LectureSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectures: Lecture[];
  selectedLectureId: string;
  onSelectLecture: (lecture: Lecture) => void;
  title?: string;
  userRole?: 'student' | 'lecturer' | 'admin';
  autoDetectedLectureId?: string;
  isReadOnly?: boolean;
  readOnlyNotice?: string;
}

export const LectureSelectionModal: React.FC<LectureSelectionModalProps> = ({
  isOpen,
  onClose,
  lectures,
  selectedLectureId,
  onSelectLecture,
  title = 'اختيار المحاضرة بناءً على الأعمدة الـ 13',
  userRole = 'student',
  autoDetectedLectureId,
  isReadOnly = false,
  readOnlyNotice,
}) => {
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState('all');
  const [filterStudyType, setFilterStudyType] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStage, setFilterStage] = useState('all');

  // Days list from lectures
  const availableDays = useMemo(() => {
    const s = new Set<string>();
    lectures.forEach((l) => {
      if (l.weekDays) s.add(l.weekDays);
    });
    return Array.from(s);
  }, [lectures]);

  // Groups list
  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    lectures.forEach((l) => {
      if (l.group) s.add(l.group);
    });
    return Array.from(s);
  }, [lectures]);

  // Stages list
  const availableStages = useMemo(() => {
    const s = new Set<string>();
    lectures.forEach((l) => {
      if (l.stage) s.add(l.stage);
    });
    return Array.from(s);
  }, [lectures]);

  // Filtered lectures based on 13 columns criteria
  const filteredLectures = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lectures.filter((l) => {
      // 1. Search across all 13 columns
      if (q) {
        const combined = [
          l.lectureId,
          l.lectureName,
          l.startTime,
          l.endTime,
          l.studyType,
          l.weekDays,
          l.group,
          l.college,
          l.university,
          l.stage,
          l.lecturerName,
          l.teacherEmail,
          l.lecturePlace,
        ].join(' ').toLowerCase();

        if (!combined.includes(q)) return false;
      }

      // Column filters
      if (filterDay !== 'all' && l.weekDays !== filterDay) return false;
      if (filterStudyType !== 'all' && l.studyType !== filterStudyType) return false;
      if (filterGroup !== 'all' && l.group !== filterGroup) return false;
      if (filterStage !== 'all' && l.stage !== filterStage) return false;

      return true;
    });
  }, [lectures, search, filterDay, filterStudyType, filterGroup, filterStage]);

  if (!isOpen) return null;

  const handleSelect = (lec: Lecture) => {
    sounds.playClick();
    onSelectLecture(lec);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full my-auto border border-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-slate-50 to-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  13 Columns
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                اختيار المحاضرة بناءً على (Lecture ID, Lecture name, Start Time, End Time, نوع الدراسة, أيام الأسبوع, Group, College, University, Stage, Lecturer name, Teacher Email, lecture place)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Mode Banner */}
        {isReadOnly && (
          <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="font-bold text-amber-950">حقل المحاضرة مجمّد للقراءة فقط (Read-Only) 🔒</p>
                <p className="text-[11px] text-amber-800">
                  {readOnlyNotice || 'تم تلقين المحاضرة المعتمدة تلقائياً بناءً على الوقت الفعلي والشعبة والمرحلة مع الالتزام التام باختيار الأستاذ دون إمكانية التجاوز اليدوي.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0">
              مجمّد رسمياً
            </span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث في الأعمدة الـ 13: رمز المحاضرة، الاسم، الأستاذ، القاعة، الإيميل، الشعبة، التوقيت..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Quick Filter Selects */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="all">جميع الأيام</option>
                {availableDays.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={filterStudyType}
                onChange={(e) => setFilterStudyType(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="all">كل أنواع الدراسة</option>
                <option value="صباحي">صباحي</option>
                <option value="مسائي">مسائي</option>
                <option value="مدمج">مدمج</option>
              </select>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="all">كل الشعب</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>شعبة {g}</option>
                ))}
              </select>

              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="all">كل المراحل</option>
                {availableStages.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              عرض <strong>{filteredLectures.length}</strong> من أصل <strong>{lectures.length}</strong> محاضرة مسجلة بالجدول
            </span>
            <span className="text-blue-700 font-semibold">
              💡 اضغط على زر &quot;اختيار هذه المحاضرة&quot; ليتم تجميد بياناتها رسمياً وتسجيل الحضور عليها
            </span>
          </div>
        </div>

        {/* 13-Columns Table View */}
        <div className="flex-1 overflow-auto p-4">
          {filteredLectures.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">لا توجد محاضرات تطابق معايير البحث والفلترة المدخلة</p>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterDay('all');
                  setFilterStudyType('all');
                  setFilterGroup('all');
                  setFilterStage('all');
                }}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                إعادة ضبط خيارات الفلترة
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">1. Lecture ID</th>
                    <th className="py-2.5 px-3">2. Lecture name</th>
                    <th className="py-2.5 px-3">3. Start Time</th>
                    <th className="py-2.5 px-3">4. End Time</th>
                    <th className="py-2.5 px-3">5. نوع الدراسة</th>
                    <th className="py-2.5 px-3">6. أيام الأسبوع</th>
                    <th className="py-2.5 px-3">7. Group</th>
                    <th className="py-2.5 px-3">8. College</th>
                    <th className="py-2.5 px-3">9. University</th>
                    <th className="py-2.5 px-3">10. Stage</th>
                    <th className="py-2.5 px-3">11. Lecturer name</th>
                    <th className="py-2.5 px-3">12. Teacher Email</th>
                    <th className="py-2.5 px-3">13. lecture place</th>
                    <th className="py-2.5 px-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLectures.map((lec, idx) => {
                    const isSelected = lec.lectureId === selectedLectureId;
                    const isAuto = lec.lectureId === autoDetectedLectureId;

                    return (
                      <tr 
                        key={lec.lectureId} 
                        className={`transition-colors ${
                          isSelected 
                            ? 'bg-blue-50/70 font-semibold' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        
                        {/* 1. Lecture ID */}
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {lec.lectureId}
                          </span>
                        </td>

                        {/* 2. Lecture name */}
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{lec.lectureName}</span>
                            {isAuto && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                مقترحة تلقائياً ⭐
                              </span>
                            )}
                            {lec.isSessionActive && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                مفتوحة الآن
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Start Time */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {lec.startTime.slice(0, 5)}
                        </td>

                        {/* 4. End Time */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {lec.endTime.slice(0, 5)}
                        </td>

                        {/* 5. نوع الدراسة */}
                        <td className="py-2.5 px-3 text-slate-700">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            lec.studyType === 'صباحي' 
                              ? 'bg-amber-50 text-amber-900 border-amber-200' 
                              : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                          }`}>
                            {lec.studyType}
                          </span>
                        </td>

                        {/* 6. أيام الأسبوع */}
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {lec.weekDays}
                        </td>

                        {/* 7. Group */}
                        <td className="py-2.5 px-3 font-bold text-blue-700">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {lec.group}
                          </span>
                        </td>

                        {/* 8. College */}
                        <td className="py-2.5 px-3 text-slate-600">
                          {lec.college}
                        </td>

                        {/* 9. University */}
                        <td className="py-2.5 px-3 text-slate-600">
                          {lec.university}
                        </td>

                        {/* 10. Stage */}
                        <td className="py-2.5 px-3 text-slate-800 font-semibold">
                          {lec.stage}
                        </td>

                        {/* 11. Lecturer name */}
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {lec.lecturerName}
                        </td>

                        {/* 12. Teacher Email */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {lec.teacherEmail}
                        </td>

                        {/* 13. lecture place */}
                        <td className="py-2.5 px-3">
                          <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1 w-fit">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{lec.lecturePlace}</span>
                          </span>
                        </td>

                        {/* Action: Select Button */}
                        <td className="py-2.5 px-3 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isReadOnly ? 'المعتمدة رسمياً 🔒' : 'المختارة حالياً'}</span>
                            </span>
                          ) : isReadOnly ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>مجمدة (للاطلاع)</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSelect(lec)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-xl shadow-xs transition-colors"
                            >
                              <span>اختيار هذه المحاضرة</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-b-3xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>عند اختيار المحاضرة، يتم تجميد وقفل كافة حقولها الـ 13 تلقائياً لحفظ نزاهة بيانات الحضور.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
