import React, { useState, useMemo } from 'react';
import { UserAccount, UserRole } from '../types/attendance';
import { DEMO_ACCOUNTS, STAFF_ACCOUNTS, BABYLON_NURSING_STUDENTS } from '../data/initialData';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserAccount) => void;
  universityName: string;
  collegeName: string;
  users?: UserAccount[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  universityName,
  collegeName,
  users = DEMO_ACCOUNTS,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  
  // Student Login Fields
  const [studentCodeInput, setStudentCodeInput] = useState('1');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Available lecturers & admins from dynamic users
  const lecturersList = useMemo(() => {
    return users.filter((u) => u.role === 'lecturer');
  }, [users]);

  const adminsList = useMemo(() => {
    return users.filter((u) => u.role === 'admin');
  }, [users]);

  // Lecturer Login Fields
  const [lecturerEmail, setLecturerEmail] = useState(() => {
    return lecturersList[0]?.email || 'hla478983@gmail.com';
  });
  const [lecturerPassword, setLecturerPassword] = useState('123456');

  // Admin Login Fields
  const [adminEmail, setAdminEmail] = useState(() => {
    return adminsList[0]?.email || '07832439718h@gmail.com';
  });
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [error, setError] = useState<string | null>(null);

  // Available students from dynamic users
  const dynamicStudents = useMemo(() => {
    const list = users.filter((u) => u.role === 'student');
    return list.map((s) => ({
      code: s.studentCode || '',
      name: s.name,
      group: s.group || 'A',
      study: 'صباحي',
    }));
  }, [users]);

  // Filter students for search dropdown
  const filteredStudents = useMemo(() => {
    const base = dynamicStudents.length > 0 ? dynamicStudents : BABYLON_NURSING_STUDENTS;
    return base.filter(
      (s) => s.name.includes(studentSearchQuery) || s.code.includes(studentSearchQuery)
    ).slice(0, 8);
  }, [dynamicStudents, studentSearchQuery]);

  const handleStudentLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanInput = studentCodeInput.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.role === 'student' &&
        (u.studentCode?.toLowerCase() === cleanInput ||
          u.email.toLowerCase() === cleanInput)
    );

    if (found) {
      onLogin(found);
    } else {
      setError(`لم يتم العثور على طالب بالرمز أو البريد (${studentCodeInput}). يرجى مراجعة إدارة الكلية لإضافتك للقيد.`);
    }
  };

  const handleLecturerLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = lecturerEmail.toLowerCase().trim();
    const found = users.find(
      (u) => u.role === 'lecturer' && u.email.toLowerCase() === cleanEmail
    );

    if (found) {
      onLogin(found);
    } else {
      setError('البريد الإلكتروني للأستاذ غير مسجل في النظام. تواصل مع إدارة الكلية لإضافتك.');
    }
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = adminEmail.toLowerCase().trim();
    const found = users.find(
      (u) => u.role === 'admin' && u.email.toLowerCase() === cleanEmail
    );

    if (found) {
      onLogin(found);
    } else {
      setError('البريد الإلكتروني لمدير النظام غير مسجل.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Container */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* University Header Brand Strip */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 text-center relative space-y-3">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>بوابة تسجيل الدخول الموحدة (RBAC)</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              نظام حضور المحاضرات الذكي
            </h1>
            <p className="text-sm font-semibold text-blue-200">
              {collegeName} — {universityName}
            </p>
          </div>

          <p className="text-xs text-blue-100/80 max-w-sm mx-auto leading-relaxed">
            تفتح لكل مستخدم واجهته الخاصة وصلاحياته فقط (الآدمن، الأستاذ، أو الطالب).
          </p>

          <div className="absolute top-4 left-4">
            <PWAInstallButton variant="login" />
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-1.5">
          <button
            type="button"
            onClick={() => { setSelectedRole('student'); setError(null); }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all ${
              selectedRole === 'student'
                ? 'bg-white text-emerald-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${selectedRole === 'student' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>بوابة الطالب</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('lecturer'); setError(null); }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all ${
              selectedRole === 'lecturer'
                ? 'bg-white text-blue-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className={`w-4 h-4 ${selectedRole === 'lecturer' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>الأستاذ المحاضر</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('admin'); setError(null); }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all ${
              selectedRole === 'admin'
                ? 'bg-white text-rose-700 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>مدير النظام</span>
          </button>
        </div>

        {/* Tab Content & Forms */}
        <div className="p-6 sm:p-8 text-right space-y-6">

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. STUDENT LOGIN FORM */}
          {selectedRole === 'student' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>تسجيل دخول الطالب (Student Login)</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  يتيح لك تسجيل الحضور في المحاضرات بالـ GPS وبصمة الجهاز دون إمكانية التعديل.
                </p>
              </div>

              {/* Quick Preset Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  اختر طالباً للتجربة السريعة أو أدخل كودك:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: '1', name: 'بلقيس محمد ناجي' },
                    { code: '2', name: 'حسن علي عامر' },
                    { code: '3', name: 'حسين علاء محمد' },
                    { code: '4', name: 'حسين محمد علاء' },
                  ].map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setStudentCodeInput(s.code)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        studentCodeInput === s.code
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.name} (كود {s.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Code Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  رمز القيد الجامعي للطالب (Student Code):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentCodeInput}
                    onChange={(e) => setStudentCodeInput(e.target.value)}
                    placeholder="مثال: 1 أو 2 أو 3"
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {/* Search by Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">
                  أو ابحث عن اسمك في قائمة طلاب كلية التمريض:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="اكتب اسم الطالب للبحث..."
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>

                {studentSearchQuery.trim() && (
                  <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white shadow-lg text-xs mt-1">
                    {filteredStudents.length === 0 ? (
                      <div className="p-2 text-slate-400 text-center">لا توجد نتائج مطابقة</div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => {
                            setStudentCodeInput(s.code);
                            setStudentSearchQuery('');
                          }}
                          className="w-full p-2 text-right hover:bg-emerald-50 flex items-center justify-between transition-colors"
                        >
                          <span className="font-bold text-slate-800">{s.name}</span>
                          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            كود {s.code} (شعبة {s.group})
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>دخول بوابة الطالب</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 2. LECTURER LOGIN FORM */}
          {selectedRole === 'lecturer' && (
            <form onSubmit={handleLecturerLogin} className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>تسجيل دخول الأستاذ المحاضر (Lecturer Portal)</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  يتيح لك إدارة محاضراتك الخاصة وإطلاق جلسات الحضور وتوليد كود الـ OTP.
                </p>
              </div>

              {/* Select Lecturer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  اختر الأستاذ المحاضر (المسجلون في الكلية):
                </label>
                <div className="space-y-2">
                  {lecturersList.map((lec) => (
                    <label
                      key={lec.id || lec.email}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        lecturerEmail.toLowerCase() === lec.email.toLowerCase()
                          ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/10'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lecturer_select"
                        checked={lecturerEmail.toLowerCase() === lec.email.toLowerCase()}
                        onChange={() => setLecturerEmail(lec.email)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-bold text-xs block">{lec.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 block">{lec.email}</span>
                        <span className="text-[10px] text-blue-700 font-semibold">{lec.stage || 'كلية التمريض'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  كلمة المرور:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={lecturerPassword}
                    onChange={(e) => setLecturerPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>دخول بوابة المحاضر</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 3. ADMIN LOGIN FORM */}
          {selectedRole === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>تسجيل دخول مدير النظام (Admin Console)</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  صلاحيات كاملة للتحكم بجميع المحاضرات والأساتذة وسجلات الحضور والربط السحابي.
                </p>
              </div>

              {/* Select Admin if multiple exist */}
              {adminsList.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    اختر حساب الإدارة المطلوب:
                  </label>
                  <div className="space-y-2">
                    {adminsList.map((adm) => (
                      <label
                        key={adm.id || adm.email}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          adminEmail.toLowerCase() === adm.email.toLowerCase()
                            ? 'bg-rose-50/80 border-rose-400 text-rose-900 ring-2 ring-rose-500/10'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="admin_select"
                          checked={adminEmail.toLowerCase() === adm.email.toLowerCase()}
                          onChange={() => setAdminEmail(adm.email)}
                          className="mt-1 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <span className="font-bold text-xs block">{adm.name}</span>
                          <span className="font-mono text-[11px] text-slate-500 block">{adm.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  البريد الإلكتروني للآدمن:
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
                <span className="text-[10px] text-slate-400">
                  الحساب المعتمد: م.ح حسين علاء جاسم (07832439718h@gmail.com)
                </span>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  كلمة المرور:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>دخول لوحة تحكم الإدارة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footer Security Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-slate-500 text-[11px] flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>نظام عزل الصلاحيات الأمني: يفتح التطبيق مباشرة لكل مستخدم واجهته فقط.</span>
        </div>

      </div>

    </div>
  );
};
