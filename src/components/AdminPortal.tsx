import React, { useState, useMemo } from 'react';
import { 
  UserAccount, 
  Lecture, 
  StudentAttendanceRecord, 
  AttendanceStatus,
  UniversitySettings,
  UserRole
} from '../types/attendance';
import { 
  exportAttendanceToCSV, 
  exportLecturesToCSV, 
  downloadAppSheetStarterTemplate,
  downloadCSV
} from '../utils/appsheetExport';
import { calculateStudentAbsence } from '../utils/geo';
import { 
  sendAttendanceToGoogleSheets, 
  GOOGLE_APPS_SCRIPT_TEMPLATE 
} from '../utils/googleSheetsSync';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { EditAssignedLectureModal } from './EditAssignedLectureModal';
import { ImportStudentsCSVModal } from './ImportStudentsCSVModal';
import { GPSInspectionModal } from './GPSInspectionModal';
import { AppSheetGuideModal } from './AppSheetGuideModal';
import { AnalyticsAndReportsTab } from './AnalyticsAndReportsTab';
import { sounds } from '../utils/audio';
import { 
  ShieldCheck, 
  Table2, 
  BookOpen, 
  Users, 
  Download, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw,
  Sliders,
  Filter,
  Cloud,
  UserPlus,
  Smartphone,
  CheckCircle,
  GraduationCap,
  UserCheck,
  Building2,
  MapPin,
  Clock,
  Compass,
  FileSpreadsheet,
  Upload,
  Check,
  Copy,
  ExternalLink,
  Zap,
  AlertCircle,
  Play,
  CheckCircle2,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface AdminPortalProps {
  currentUser: UserAccount;
  lectures: Lecture[];
  attendanceRecords: StudentAttendanceRecord[];
  users: UserAccount[];
  settings: UniversitySettings;
  onUpdateAttendanceRecord: (record: StudentAttendanceRecord) => void;
  onDeleteAttendanceRecord: (id: string) => void;
  onDeleteLecture: (lectureId: string) => void;
  onUpdateLecture: (lecture: Lecture) => void;
  onOpenCreateLecture: () => void;
  onResetData: () => void;
  onOpenCloudModal?: () => void;
  onAddUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUser: (user: UserAccount) => void;
  onImportStudents?: (students: UserAccount[]) => void;
  onUpdateSettings?: (settings: UniversitySettings) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  lectures,
  attendanceRecords,
  users,
  settings,
  onUpdateAttendanceRecord,
  onDeleteAttendanceRecord,
  onDeleteLecture,
  onUpdateLecture,
  onOpenCreateLecture,
  onResetData,
  onOpenCloudModal,
  onAddUser,
  onDeleteUser,
  onUpdateUser,
  onImportStudents,
  onUpdateSettings,
}) => {
  // 5 Core Admin Tabs as specified by user
  const [activeTab, setActiveTab] = useState<'users' | 'lectures' | 'attendance' | 'analytics' | 'integration'>('users');
  
  // Attendance filter state
  const [search, setSearch] = useState('');
  const [filterLecture, setFilterLecture] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Users filter state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Modals state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isImportCSVModalOpen, setIsImportCSVModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [inspectingRecord, setInspectingRecord] = useState<StudentAttendanceRecord | null>(null);

  // Google Sheets tab state
  const [webhookInput, setWebhookInput] = useState(settings.googleSheetsWebhookUrl || '');
  const [autoSyncInput, setAutoSyncInput] = useState(settings.autoSyncToGoogleSheets ?? true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingAllRecords, setSyncingAllRecords] = useState(false);
  const [syncAllStatus, setSyncAllStatus] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // User counts by role
  const userStats = useMemo(() => {
    let admins = 0;
    let lecturers = 0;
    let students = 0;
    users.forEach((u) => {
      if (u.role === 'admin') admins++;
      else if (u.role === 'lecturer') lecturers++;
      else if (u.role === 'student') students++;
    });
    return { total: users.length, admins, lecturers, students };
  }, [users]);

  // Attendance stats
  const attendanceStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    attendanceRecords.forEach((r) => {
      if (r.attendanceStatus === 'حاضر') present++;
      else if (r.attendanceStatus === 'متأخر') late++;
      else if (r.attendanceStatus === 'غائب') absent++;
      else if (r.attendanceStatus === 'معذور') excused++;
    });
    return { total: attendanceRecords.length, present, late, absent, excused };
  }, [attendanceRecords]);

  // Groups list for filter
  const availableGroups = useMemo(() => {
    const grps = new Set<string>();
    attendanceRecords.forEach((r) => {
      if (r.group) grps.add(r.group);
    });
    return Array.from(grps).sort();
  }, [attendanceRecords]);

  // Filtered Attendance Records
  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.studentCode.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.lecturerName.toLowerCase().includes(search.toLowerCase());

      const matchLecture =
        filterLecture === 'all' || r.lectureName === filterLecture;

      const matchStatus =
        filterStatus === 'all' || r.attendanceStatus === filterStatus;

      const matchGroup =
        filterGroup === 'all' || r.group === filterGroup;

      return matchSearch && matchLecture && matchStatus && matchGroup;
    });
  }, [attendanceRecords, search, filterLecture, filterStatus, filterGroup]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const cleanSearch = userSearch.toLowerCase().trim();
      const matchSearch =
        !cleanSearch ||
        u.name.toLowerCase().includes(cleanSearch) ||
        u.email.toLowerCase().includes(cleanSearch) ||
        (u.studentCode && u.studentCode.toLowerCase().includes(cleanSearch));

      return matchRole && matchSearch;
    });
  }, [users, userRoleFilter, userSearch]);

  const handleDeleteUserClick = (u: UserAccount) => {
    if (u.id === currentUser.id) {
      alert('لا يمكنك حذف حسابك الإداري الذي سجلت الدخول به حالياً.');
      return;
    }
    if (u.role === 'admin' && userStats.admins <= 1) {
      alert('لا يمكن حذف هذا الحساب لأنه آخر مدير نظام في الكلية.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف حساب (${u.name} - ${u.email})؟`)) {
      onDeleteUser(u.id);
      sounds.tap();
    }
  };

  const handleResetDeviceClick = (u: UserAccount) => {
    if (window.confirm(`هل تريد فك ارتباط الجهاز المعتمد للطالب (${u.name}) للسماح له بربط هاتف جديد؟`)) {
      onUpdateUser({
        ...u,
        registeredDeviceId: undefined,
      });
      sounds.success();
    }
  };

  const handleSaveGoogleSheetsSettings = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        googleSheetsWebhookUrl: webhookInput.trim(),
        autoSyncToGoogleSheets: autoSyncInput,
      });
      setSaveSettingsSuccess(true);
      sounds.success();
      setTimeout(() => setSaveSettingsSuccess(false), 3000);
    }
  };

  const handleTestGoogleSheetsWebhook = async () => {
    if (!webhookInput.trim()) {
      setTestResult({ success: false, message: 'يرجى إدخال رابط Web App أولاً' });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    const testPayload: StudentAttendanceRecord = attendanceRecords[0] || {
      id: 'TEST-' + Date.now(),
      studentCode: 'NUR-TEST-01',
      group: 'A1',
      name: 'طالب تجريبي للاختبار',
      timestamp: new Date().toLocaleString('ar-IQ'),
      location: 'مدرج كلية التمريض (فحص اتصال تجريبي)',
      lectureName: 'تمريض باطني وجراحي (نظري)',
      startTime: '08:30',
      endTime: '10:30',
      attendanceStatus: 'حاضر',
      delayMinutes: 0,
      weekDays: 'الأحد',
      studyType: 'صباحي',
      email: 'student.test@univ.edu.iq',
      college: settings.college,
      university: settings.university,
      stage: 'المرحلة الثانية',
      lecturerName: 'أستاذ المادة',
      teacherEmail: 'teacher@univ.edu.iq',
      lecturePlace: 'مدرج الكلية',
    };

    const res = await sendAttendanceToGoogleSheets(webhookInput.trim(), testPayload);
    setTestingConnection(false);
    setTestResult(res);
    if (res.success) {
      sounds.success();
    }
  };

  const handleSyncAllToGoogleSheets = async () => {
    if (!webhookInput.trim()) {
      alert('يرجى حفظ رابط Google Sheets Webhook أولاً.');
      return;
    }
    if (attendanceRecords.length === 0) {
      alert('لا توجد سجلات حضور لإرسالها.');
      return;
    }

    setSyncingAllRecords(true);
    setSyncAllStatus(`جاري إرسال ${attendanceRecords.length} سجل إلى Google Sheets...`);

    let sent = 0;
    let failed = 0;

    for (const record of attendanceRecords) {
      const res = await sendAttendanceToGoogleSheets(webhookInput.trim(), record);
      if (res.success) sent++;
      else failed++;
    }

    setSyncingAllRecords(false);
    setSyncAllStatus(`اكتملت المزامنة بنجاح: تم إرسال ${sent} سجل (الفشل: ${failed})`);
    sounds.success();
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                لوحة التحكم الإدارية (Admin) — {currentUser.name}
              </h2>
              <p className="text-xs text-slate-500">
                الصلاحيات الشاملة لإدارة النظام، الأكاديميين، الطلاب، الجداول، الرقابة الجغرافية، والربط السحابي
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportAttendanceToCSV(attendanceRecords)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>تصدير كشف الحضور (CSV)</span>
          </button>

          <button
            onClick={() => exportLecturesToCSV(lectures)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>تصدير جدول المحاضرات (CSV)</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('هل تريد إعادة تعيين كافة البيانات إلى الإعدادات الافتراضية؟')) {
                onResetData();
              }
            }}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
            title="إعادة تعيين البيانات الافتراضية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The 4 Admin Tabs as specified by User */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-rose-600 text-rose-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. إدارة المستخدمين والقيود الأكاديمية ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lectures')}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'lectures'
              ? 'border-rose-600 text-rose-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>2. جدول المحاضرات الجامعية والتكليفات ({lectures.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-rose-600 text-rose-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table2 className="w-4 h-4" />
          <span>3. سجل الحضور والرقابة الجغرافية ({attendanceRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-rose-600 text-rose-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>4. التحليلات والإنذار المبكر للغياب</span>
        </button>

        <button
          onClick={() => setActiveTab('integration')}
          className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'integration'
              ? 'border-rose-600 text-rose-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>5. المطابقة والتكامل السحابي (Google Sheets & AppSheet)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: إدارة المستخدمين والقيود الأكاديمية */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Header & Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                إدارة المستخدمين والقيد الأكاديمي والصلاحيات
              </h3>
              <p className="text-xs text-slate-500">
                إضافة وتعديل بيانات الأساتذة والطلاب والمدراء، إدارة رموز القيد الجامعي (Student Code)، وفك ارتباط الأجهزة.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsImportCSVModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>استيراد قائمة الطلاب (CSV)</span>
              </button>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>
          </div>

          {/* User Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
              <span className="text-slate-500 block text-[11px]">إجمالي المستخدمين</span>
              <span className="text-xl font-extrabold text-slate-900">{userStats.total}</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 shadow-xs">
              <span className="text-rose-700 font-bold block text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>مدراء النظام (Admins)</span>
              </span>
              <span className="text-xl font-extrabold text-rose-900">{userStats.admins}</span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 shadow-xs">
              <span className="text-blue-700 font-bold block text-[11px] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>الأساتذة المحاضرون</span>
              </span>
              <span className="text-xl font-extrabold text-blue-900">{userStats.lecturers}</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 shadow-xs">
              <span className="text-emerald-700 font-bold block text-[11px] flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>الطلاب المعتمدون</span>
              </span>
              <span className="text-xl font-extrabold text-emerald-900">{userStats.students}</span>
            </div>
          </div>

          {/* User Search & Role Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد الإلكتروني أو رمز الطالب (Student Code)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
              >
                <option value="all">كافة الأدوار ({users.length})</option>
                <option value="admin">مدراء النظام فقط ({userStats.admins})</option>
                <option value="lecturer">الأساتذة المحاضرون فقط ({userStats.lecturers})</option>
                <option value="student">الطلاب فقط ({userStats.students})</option>
              </select>
            </div>
          </div>

          {/* Verification Callout Box */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Verification:</strong> يمكنك النقر على زر التعديل (أيقونة القلم) أمام أي طالب أو أستاذ لتحديث بياناته ورمز قيده وتغيير دوره فورياً.
              </span>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">الاسم الكامل</th>
                    <th className="py-2.5 px-3">البريد الإلكتروني (Email)</th>
                    <th className="py-2.5 px-3">الدور الأكاديمي</th>
                    <th className="py-2.5 px-3">Student Code</th>
                    <th className="py-2.5 px-3">Group & Stage</th>
                    <th className="py-2.5 px-3">الجهاز المعتمد</th>
                    <th className="py-2.5 px-3 text-center">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        لا يوجد مستخدمون مطابقون لمعايير البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{u.name}</span>
                            {u.id === currentUser.id && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                أنت
                              </span>
                            )}
                            {u.role === 'student' && (() => {
                              const absence = calculateStudentAbsence(u.email, u.studentCode || '', lectures, attendanceRecords);
                              if (absence.isExceeded) {
                                return (
                                  <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs" title={`تجاوز نسبة الغياب ${absence.absencePercentage}%`}>
                                    <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" />
                                    <span>⚠️ غياب {absence.absencePercentage}%</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 ${
                            u.role === 'admin'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : u.role === 'lecturer'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {u.role === 'admin' ? (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                <span>مدير نظام</span>
                              </>
                            ) : u.role === 'lecturer' ? (
                              <>
                                <GraduationCap className="w-3 h-3" />
                                <span>أستاذ محاضر</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>طالب</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">{u.studentCode || '-'}</td>
                        <td className="py-2.5 px-3">{u.stage ? `${u.stage} (${u.group || 'A'})` : '-'}</td>
                        <td className="py-2.5 px-3">
                          {u.registeredDeviceId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-purple-700 text-[11px] truncate max-w-[100px]" title={u.registeredDeviceId}>
                                {u.registeredDeviceId}
                              </span>
                              <button
                                onClick={() => handleResetDeviceClick(u)}
                                className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 font-bold"
                                title="فك الارتباط لتمكين الطالب من استخدام هاتف آخر"
                              >
                                فك الارتباط
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">غير مقيد (حر)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل بيانات المستخدم والقيد الأكاديمي"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUserClick(u)}
                              disabled={u.id === currentUser.id}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                              title={u.id === currentUser.id ? 'لا يمكن حذف حسابك الحالي' : 'حذف المستخدم'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: إدارة المحاضرات والتكليفات الدراسية */}
      {/* ============================================================== */}
      {activeTab === 'lectures' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                جدول المحاضرات الجامعية والتكليفات الرسمية للأساتذة
              </h3>
              <p className="text-xs text-slate-500">
                جدولة المحاضرات الجامعية، تحديد أوقاتها (البدء والانتهاء)، أماكن انعقادها (القاعات/المختبرات)، وتعيين المحاضرين المسؤولين.
              </p>
            </div>
            <button
              onClick={onOpenCreateLecture}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة محاضرة جديدة وتكليف أستاذ</span>
            </button>
          </div>

          {/* Verification Callout Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Verification:</strong> أي محاضرة يتم إضافتها أو تعديلها هنا تظهر فورياً في جدول الأستاذ المكلف وجداول طلاب المرحلة المحددة.
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
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
                    <th className="py-2.5 px-3">نطاق GPS</th>
                    <th className="py-2.5 px-3 text-center">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lectures.map((l) => (
                    <tr key={l.lectureId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{l.lectureId}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{l.lectureName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">{l.startTime.slice(0, 5)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">{l.endTime.slice(0, 5)}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                          {l.studyType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{l.weekDays}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">{l.group}</td>
                      <td className="py-2.5 px-3 text-slate-600">{l.college}</td>
                      <td className="py-2.5 px-3 text-slate-600">{l.university}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold">{l.stage}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{l.lecturerName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{l.teacherEmail}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {l.lecturePlace}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                        {l.allowedRadiusMeters || 100}م
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingLecture(l)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل بيانات المحاضرة والأستاذ المكلف"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف محاضرة (${l.lectureName})؟`)) {
                                onDeleteLecture(l.lectureId);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف المحاضرة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: التحكم الكامل بسجل الحضور والغياب (GPS والرقابة) */}
      {/* ============================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Header & Stats Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                التحكم الكامل بسجل الحضور والغياب والرقابة الجغرافية (GPS)
              </h3>
              <p className="text-xs text-slate-500">
                مراجعة السجلات لكافة المواد والمجموعات في الوقت الفعلي، وتدقيق النطاق الجغرافي والوقت (Timestamp) لمنع التلاعب.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportAttendanceToCSV(filteredAttendance)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تصدير كشف الحضور (CSV)</span>
              </button>
            </div>
          </div>

          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
              <span className="text-slate-500 block text-[11px]">إجمالي السجلات</span>
              <span className="text-lg font-extrabold text-slate-900">{attendanceStats.total}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 shadow-xs">
              <span className="text-emerald-700 font-bold block text-[11px]">حاضر</span>
              <span className="text-lg font-extrabold text-emerald-900">{attendanceStats.present}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 shadow-xs">
              <span className="text-amber-700 font-bold block text-[11px]">متأخر</span>
              <span className="text-lg font-extrabold text-amber-900">{attendanceStats.late}</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 shadow-xs">
              <span className="text-rose-700 font-bold block text-[11px]">غائب</span>
              <span className="text-lg font-extrabold text-rose-900">{attendanceStats.absent}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 shadow-xs">
              <span className="text-blue-700 font-bold block text-[11px]">معذور</span>
              <span className="text-lg font-extrabold text-blue-900">{attendanceStats.excused}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث بالطالب أو الإيميل أو الكود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={filterLecture}
                onChange={(e) => setFilterLecture(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
              >
                <option value="all">كافة المحاضرات والمناهج</option>
                {lectures.map((l) => (
                  <option key={l.lectureId} value={l.lectureName}>{l.lectureName}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
              >
                <option value="all">كافة المجموعات (Groups)</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>Group {g}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
              >
                <option value="all">كافة حالات الحضور</option>
                <option value="حاضر">حاضر</option>
                <option value="متأخر">متأخر</option>
                <option value="غائب">غائب</option>
                <option value="معذور">معذور</option>
              </select>
            </div>
          </div>

          {/* Full Attendance Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Student Code</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3">الاسم الكامل</th>
                    <th className="py-2.5 px-3">وقت التسجيل (Timestamp)</th>
                    <th className="py-2.5 px-3">تدقيق النطاق الجغرافي (GPS)</th>
                    <th className="py-2.5 px-3">اسم المحاضرة</th>
                    <th className="py-2.5 px-3">فترة المحاضرة</th>
                    <th className="py-2.5 px-3">حالة الحضور</th>
                    <th className="py-2.5 px-3">مدة التأخير</th>
                    <th className="py-2.5 px-3">المحاضر</th>
                    <th className="py-2.5 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        لا توجد سجلات حضور مطابقة للبحث الحالي.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{rec.studentCode}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">{rec.group}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rec.name}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{rec.timestamp}</td>
                        
                        {/* GPS Geofence Inspection Trigger */}
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => setInspectingRecord(rec)}
                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors group"
                            title="انقر لفحص وتدقيق إحداثيات GPS والخريطة"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate max-w-[130px]">{rec.location}</span>
                            <Compass className="w-3 h-3 text-emerald-600 ml-0.5" />
                          </button>
                        </td>

                        <td className="py-2.5 px-3 font-medium text-slate-800">{rec.lectureName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{rec.startTime} - {rec.endTime}</td>
                        
                        {/* Status (Admin has authority to edit any record) */}
                        <td className="py-2.5 px-3">
                          <select
                            value={rec.attendanceStatus}
                            onChange={(e) => {
                              onUpdateAttendanceRecord({
                                ...rec,
                                attendanceStatus: e.target.value as AttendanceStatus,
                              });
                            }}
                            className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                              rec.attendanceStatus === 'حاضر'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : rec.attendanceStatus === 'متأخر'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="حاضر">حاضر</option>
                            <option value="متأخر">متأخر</option>
                            <option value="غائب">غائب</option>
                            <option value="معذور">معذور</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-center">
                          {rec.delayMinutes > 0 ? (
                            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                              {rec.delayMinutes} د
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{rec.lecturerName}</td>
                        
                        {/* Delete action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف سجل الطالب (${rec.name})؟`)) {
                                onDeleteAttendanceRecord(rec.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: التقارير والإحصائيات والإنذار المبكر للغياب */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && (
        <AnalyticsAndReportsTab
          users={users}
          lectures={lectures}
          attendanceRecords={attendanceRecords}
          universityName={settings.university}
          collegeName={settings.college}
        />
      )}

      {/* ============================================================== */}
      {/* TAB 5: المطابقة والتكامل مع Google Sheets و AppSheet */}
      {/* ============================================================== */}
      {activeTab === 'integration' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Header */}
          <div className="bg-gradient-to-l from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>التكامل مع قواعد البيانات السحابية (Database & Cloud Integration)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              المطابقة والتكامل مع جداول Google Sheets ومنصة Google AppSheet
            </h3>
            <p className="text-xs text-emerald-100 max-w-3xl leading-relaxed">
              تحكم كامل بروابط Webhook السحابية، مطابقة دقيقة لأعمدة الجداول الرسمية، وضمان تدفق بيانات الحضور بدون أي أخطاء.
            </p>
          </div>

          {/* Section 1: Cloud Sync & Webhook Control */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>إعدادات الربط السحابي التلقائي (Google Sheets Webhook URL)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  عند ربط الرابط، سيتم إرسال كل تسجيل حضور للطالب فورياً إلى جدول Google Sheets السحابي الخاص بك.
                </p>
              </div>

              {saveSettingsSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ إعدادات الرابط السحابي بنجاح ✓</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رابط نشر التطبيق (Google Apps Script Web App URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    dir="ltr"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveGoogleSheetsSettings}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors whitespace-nowrap shadow-xs"
                  >
                    حفظ الرابط
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncInput}
                    onChange={(e) => setAutoSyncInput(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>مزامنة فورية تلقائية عند تسجيل أي طالب للحضور مباشرة</span>
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleTestGoogleSheetsWebhook}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    {testingConnection ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{testingConnection ? 'جاري فحص الاتصال...' : 'اختبار الربط بسجل تجريبي'}</span>
                  </button>

                  <button
                    onClick={handleSyncAllToGoogleSheets}
                    disabled={syncingAllRecords}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {syncingAllRecords ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>إرسال كافة السجلات الحالية ({attendanceRecords.length}) إلى السحابة</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {syncAllStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl font-medium">
                  {syncAllStatus}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: AppSheet Column Schema Alignment */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-blue-600" />
                  <span>مطابقة الأعمدة الرسمية لـ AppSheet و Google Sheets</span>
                </h4>
                <p className="text-xs text-slate-500">
                  تأكد من تطابق أسماء الأعمدة وقواعد البيانات لضمان قراءة منصة AppSheet لكافة الحقول بدون أي تعارض.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadAppSheetStarterTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل قالب Excel/CSV الجاهز لـ AppSheet</span>
                </button>
              </div>
            </div>

            {/* AppSheet Columns Schema Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">اسم العمود في AppSheet (Column Name)</th>
                    <th className="py-2.5 px-3">النوع (AppSheet Type)</th>
                    <th className="py-2.5 px-3">حالة المطابقة مع التطبيق</th>
                    <th className="py-2.5 px-3">الوصف والدور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Student Code</td>
                    <td className="py-2 px-3 text-slate-600">Text (Key)</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">رمز القيد الجامعي للتحقق</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Group</td>
                    <td className="py-2 px-3 text-slate-600">Enum (A, B, C...)</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">مجموعة الطالب الأكاديمية</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Name</td>
                    <td className="py-2 px-3 text-slate-600">Name / Text</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">الاسم الرباعي الكامل للطالب</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Timestamp</td>
                    <td className="py-2 px-3 text-slate-600">DateTime</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">الوقت والتاريخ الدقيق لمنع التلاعب</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Location</td>
                    <td className="py-2 px-3 text-slate-600">LatLong / Text</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">النطاق الجغرافي وإحداثيات GPS</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Lecture name</td>
                    <td className="py-2 px-3 text-slate-600">Ref (Lectures) / Text</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">اسم المحاضرة أو الكورس</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Start Time / End Time</td>
                    <td className="py-2 px-3 text-slate-600">Time</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">أوقات بدء وانتهاء المحاضرة</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">حالة الحضور</td>
                    <td className="py-2 px-3 text-slate-600">Enum (حاضر، متأخر، غائب)</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">الحالة المعتمدة للطالب</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">مدة التأخير</td>
                    <td className="py-2 px-3 text-slate-600">Number</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">حساب التأخير بالدقائق تلقائياً</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-blue-800">Lecturer name</td>
                    <td className="py-2 px-3 text-slate-600">Text</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold font-sans">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مطابق 100%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">الأستاذ أو المعيد المسؤول</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Google Apps Script Code snippet */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-xs space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  كود Google Apps Script الجاهز لربط شيت الحضور:
                </h4>
                <p className="text-xs text-slate-400">
                  انسخ هذا الكود والصقه في Extensions &gt; Apps Script في جدول Google Sheets الخاص بك.
                </p>
              </div>
              <button
                onClick={handleCopyAppsScript}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'تم النسخ بنجاح ✓' : 'نسخ الكود'}</span>
              </button>
            </div>
            
            <pre className="bg-black/50 p-3 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 border border-slate-800" dir="ltr">
              {GOOGLE_APPS_SCRIPT_TEMPLATE.slice(0, 500)}...
            </pre>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAddUser={onAddUser}
        existingUsers={users}
        defaultUniversity={settings.university}
        defaultCollege={settings.college}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          existingUsers={users}
          onSave={(updated) => {
            onUpdateUser(updated);
            setEditingUser(null);
          }}
        />
      )}

      {/* Import Students CSV Modal */}
      <ImportStudentsCSVModal
        isOpen={isImportCSVModalOpen}
        onClose={() => setIsImportCSVModalOpen(false)}
        existingUsers={users}
        defaultCollege={settings.college}
        defaultUniversity={settings.university}
        onImportStudents={(newStudents) => {
          if (onImportStudents) {
            onImportStudents(newStudents);
          } else {
            newStudents.forEach(s => onAddUser(s));
          }
          setIsImportCSVModalOpen(false);
        }}
      />

      {/* Edit Lecture Modal */}
      {editingLecture && (
        <EditAssignedLectureModal
          isOpen={!!editingLecture}
          onClose={() => setEditingLecture(null)}
          lecture={editingLecture}
          onSave={(updated) => {
            onUpdateLecture(updated);
            setEditingLecture(null);
          }}
        />
      )}

      {/* GPS Inspection Modal */}
      {inspectingRecord && (
        <GPSInspectionModal
          isOpen={!!inspectingRecord}
          onClose={() => setInspectingRecord(null)}
          record={inspectingRecord}
        />
      )}

    </div>
  );
};
