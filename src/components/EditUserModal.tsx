import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, StudyType } from '../types/attendance';
import { sounds } from '../utils/audio';
import { 
  UserCog, 
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
  AlertCircle,
  Smartphone,
  Save,
  RotateCcw
} from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onSave: (updatedUser: UserAccount) => void;
  existingUsers: UserAccount[];
  isCurrentUserSuperAdmin?: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  existingUsers,
  isCurrentUserSuperAdmin = true,
}) => {
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [stage, setStage] = useState('المرحلة الثانية');
  const [group, setGroup] = useState('A');
  const [studyType, setStudyType] = useState<StudyType>('صباحي');
  const [college, setCollege] = useState('');
  const [university, setUniversity] = useState('');
  const [registeredDeviceId, setRegisteredDeviceId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setName(user.name);
      setEmail(user.email);
      setStudentCode(user.studentCode || '');
      setStage(user.stage || 'المرحلة الثانية');
      setGroup(user.group || 'A');
      setCollege(user.college || '');
      setUniversity(user.university || '');
      setRegisteredDeviceId(user.registeredDeviceId);
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('يرجى إدخال الاسم الكامل للمستخدم.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }

    // Check email uniqueness against other users
    const emailConflict = existingUsers.some(
      (u) => u.id !== user.id && u.email.toLowerCase() === cleanEmail
    );
    if (emailConflict) {
      setError('هذا البريد الإلكتروني مسجل مسبقاً لمستخدم آخر.');
      return;
    }

    // If Student, validate student code
    if (role === 'student') {
      const cleanCode = studentCode.trim();
      if (!cleanCode) {
        setError('يرجى إدخال رمز القيد الجامعي للطالب (Student Code).');
        return;
      }

      const codeConflict = existingUsers.some(
        (u) => u.id !== user.id && u.role === 'student' && u.studentCode === cleanCode
      );
      if (codeConflict) {
        setError(`رمز القيد (${cleanCode}) مسجل مسبقاً لطالب آخر. يرجى اختيار رمز غير مكرر.`);
        return;
      }
    }

    const updated: UserAccount = {
      ...user,
      name: cleanName,
      email: cleanEmail,
      role,
      college: college.trim() || user.college,
      university: university.trim() || user.university,
      stage: role === 'student' ? stage : undefined,
      group: role === 'student' ? group : undefined,
      studentCode: role === 'student' ? studentCode.trim() : undefined,
      registeredDeviceId: registeredDeviceId,
    };

    sounds.success();
    onSave(updated);
    onClose();
  };

  const handleResetDevice = () => {
    if (window.confirm('هل أنت متأكد من فك ارتباط الجهاز المعتمد؟ سيتمكن الطالب من تسجيل الدخول من هاتف جديد.')) {
      setRegisteredDeviceId(undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-5 text-right my-8 animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                تعديل بيانات المستخدم والقيد الأكاديمي
              </h3>
              <p className="text-xs text-slate-500">
                تحديث الاسم، الدور الأكاديمي، رمز القيد (Student Code) والجهاز المعتمد
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <UserCog className="w-5 h-5" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              الدور الأكاديمي والصلاحية:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  role === 'student'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>طالب جامعي</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('lecturer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  role === 'lecturer'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>أستاذ محاضر</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  role === 'admin'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>مدير نظام (Admin)</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الاسم الكامل أو الرباعي:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: د. علي كاظم أو أحمد محمد حميد"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              البريد الإلكتروني الجامعي (Email):
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@univ.edu.iq"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-left focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Student-Specific Fields */}
          {role === 'student' && (
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
                <Hash className="w-3.5 h-3.5" />
                <span>بيانات القيد الجامعي للتحقق عند تسجيل الحضور:</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                  رمز القيد الجامعي (Student Code) / رقم الهوية:
                </label>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="مثال: 101 أو NUR-001 أو رقم البطاقة الجامعية"
                  dir="ltr"
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-left font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  هذا الرمز يُطابق رمز الحضور في جدول AppSheet وقوائم الكلية الرسمية.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    المرحلة الدراسية:
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 text-xs font-semibold"
                  >
                    <option value="المرحلة الأولى">المرحلة الأولى</option>
                    <option value="المرحلة الثانية">المرحلة الثانية</option>
                    <option value="المرحلة الثالثة">المرحلة الثالثة</option>
                    <option value="المرحلة الرابعة">المرحلة الرابعة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    المجموعة (Group):
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 text-xs font-semibold"
                  >
                    <option value="A">Group A</option>
                    <option value="B">Group B</option>
                    <option value="C">Group C</option>
                    <option value="D">Group D</option>
                    <option value="A1">Group A1</option>
                    <option value="A2">Group A2</option>
                    <option value="B1">Group B1</option>
                    <option value="B2">Group B2</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Device Fingerprint Binding Management */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>ربط الجهاز المعتمد:</span>
              </div>
              {registeredDeviceId ? (
                <button
                  type="button"
                  onClick={handleResetDevice}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>فك ارتباط الجهاز</span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  الجهاز غير مقيد (حر)
                </span>
              )}
            </div>
            {registeredDeviceId ? (
              <p className="text-[11px] text-slate-500 font-mono mt-1 truncate" title={registeredDeviceId}>
                معرف الجهاز: <span className="font-bold text-purple-800">{registeredDeviceId}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                سيتم حفظ بصمة أول هاتف يسجل منه الطالب تلقائياً لمنع التلاعب.
              </p>
            )}
          </div>

          {/* University & College info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-600 text-[11px] font-semibold mb-1">الكلية:</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 text-[11px] font-semibold mb-1">الجامعة:</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات الأكاديمية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
