import React, { useState } from 'react';
import { UserAccount, UserRole, StudyType } from '../types/attendance';
import { sounds } from '../utils/audio';
import { 
  UserPlus, 
  X, 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  Mail, 
  User, 
  Hash, 
  Layers, 
  Building2, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (user: UserAccount) => void;
  existingUsers: UserAccount[];
  defaultUniversity: string;
  defaultCollege: string;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
  existingUsers,
  defaultUniversity,
  defaultCollege,
}) => {
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [stage, setStage] = useState('المرحلة الثانية');
  const [group, setGroup] = useState('A');
  const [studyType, setStudyType] = useState<StudyType>('صباحي');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('يرجى إدخال الاسم الرباعي أو الكامل.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }

    // Check email uniqueness
    const emailExists = existingUsers.some(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (emailExists) {
      setError('هذا البريد الإلكتروني مسجل مسبقاً لمستخدم آخر.');
      return;
    }

    // If Student, validate student code
    if (role === 'student') {
      const cleanCode = studentCode.trim();
      if (!cleanCode) {
        setError('يرجى إدخال رمز الطالب (Student Code).');
        return;
      }

      const codeExists = existingUsers.some(
        (u) => u.role === 'student' && u.studentCode === cleanCode
      );
      if (codeExists) {
        setError(`رمز الطالب (${cleanCode}) مسجل مسبقاً لطالب آخر. يرجى اختيار رمز مختلف.`);
        return;
      }
    }

    const newUser: UserAccount = {
      id: `USR-${Date.now().toString().slice(-6)}`,
      name: cleanName,
      email: cleanEmail,
      role,
      college: defaultCollege,
      university: defaultUniversity,
      stage: role === 'student' ? stage : undefined,
      group: role === 'student' ? group : undefined,
      studentCode: role === 'student' ? studentCode.trim() : undefined,
      avatar:
        role === 'admin'
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
          : role === 'lecturer'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    onAddUser(newUser);
    sounds.playSuccessChime();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                إضافة مستخدم جديد للنظام (صلاحيات الإدارة)
              </h3>
              <p className="text-xs text-slate-500">
                إضافة أدمن مسؤول جديد، أستاذ محاضر، أو طالب جامعي معتمد
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

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            اختر نوع المستخدم المطلوب إضافته:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                role === 'student'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCheck className={`w-5 h-5 ${role === 'student' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-xs">طالب جامعي</span>
              <span className="text-[10px] text-slate-400 font-normal">تسجيل حضور فقط</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('lecturer')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                role === 'lecturer'
                  ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className={`w-5 h-5 ${role === 'lecturer' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-xs">أستاذ محاضر</span>
              <span className="text-[10px] text-slate-400 font-normal">إدارة محاضراته المكلف بها</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className={`w-5 h-5 ${role === 'admin' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span className="text-xs">أدمن مسؤول</span>
              <span className="text-[10px] text-slate-400 font-normal">تحكم كامل بالنظام</span>
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                الاسم الكامل: *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder={
                    role === 'admin' 
                      ? 'مثال: أ.د. علي محمد' 
                      : role === 'lecturer' 
                      ? 'مثال: د. سارة أحمد' 
                      : 'مثال: فاطمة عامر ناصر'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                البريد الإلكتروني (Email): *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="name@university.edu.iq"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Student Specific Fields */}
          {role === 'student' && (
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
              <span className="text-emerald-900 font-bold block text-[11px]">
                بيانات القيد والرمز الجامعي للطالب:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student Code: *
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: 45 أو 2026-045"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-mono font-bold text-blue-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">رمز تسجيل الدخول السريع</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    الشعبة (Group): *
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                  >
                    <option value="A">Group A</option>
                    <option value="B">Group B</option>
                    <option value="C">Group C</option>
                    <option value="D">Group D</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نوع الدراسة: *
                  </label>
                  <select
                    value={studyType}
                    onChange={(e) => setStudyType(e.target.value as StudyType)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold"
                  >
                    <option value="صباحي">صباحي</option>
                    <option value="مسائي">مسائي</option>
                    <option value="مدمج">مدمج</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  المرحلة الدراسية:
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs"
                >
                  <option value="المرحلة الأولى">المرحلة الأولى</option>
                  <option value="المرحلة الثانية">المرحلة الثانية</option>
                  <option value="المرحلة الثالثة">المرحلة الثالثة</option>
                  <option value="المرحلة الرابعة">المرحلة الرابعة</option>
                </select>
              </div>
            </div>
          )}

          {/* Affiliation Summary */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>الجهة الجامعية:</span>
            </span>
            <span className="font-bold text-slate-800">
              {defaultCollege} — {defaultUniversity}
            </span>
          </div>

          {/* Actions */}
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
              <CheckCircle className="w-4 h-4" />
              <span>حفظ وإضافة المستخدم</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
