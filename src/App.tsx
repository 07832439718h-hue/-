import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserAccount, 
  Lecture, 
  StudentAttendanceRecord, 
  UniversitySettings,
  ExcuseRequest
} from './types/attendance';
import { 
  getStoredUsers, 
  saveUsers,
  getCurrentUser, 
  saveCurrentUser, 
  getStoredLectures, 
  saveLectures, 
  getStoredAttendance, 
  saveAttendance, 
  getStoredSettings, 
  saveSettings, 
  resetUniversityData 
} from './services/storage';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { StudentAttendancePortal } from './components/StudentAttendancePortal';
import { LecturerPortal } from './components/LecturerPortal';
import { AdminPortal } from './components/AdminPortal';
import { LecturesManagerModal } from './components/LecturesManagerModal';
import { AppSheetGuideModal } from './components/AppSheetGuideModal';
import { ShareAppModal } from './components/ShareAppModal';
import { GoogleSheetsWebhookModal } from './components/GoogleSheetsWebhookModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { FileSpreadsheet, WifiOff, Cloud, Share2, LogOut } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [lectures, setLectures] = useState<Lecture[]>(() => getStoredLectures());
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecord[]>(() => getStoredAttendance());
  const [settings, setSettings] = useState<UniversitySettings>(() => getStoredSettings());
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>(() => {
    try {
      const saved = localStorage.getItem('babylon_excuse_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCreateLectureOpen, setIsCreateLectureOpen] = useState(false);
  const [showAppSheetGuide, setShowAppSheetGuide] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('babylon_excuse_requests', JSON.stringify(excuseRequests));
    } catch {}
  }, [excuseRequests]);

  const handleAddExcuseRequest = useCallback((req: ExcuseRequest) => {
    setExcuseRequests((prev) => [req, ...prev]);
  }, []);

  const handleUpdateExcuseRequest = useCallback((updated: ExcuseRequest) => {
    setExcuseRequests((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (updated.status === 'accepted') {
      setAttendanceRecords((prev) => {
        const existingIndex = prev.findIndex(
          (r) => r.studentCode === updated.studentCode && r.lectureName === updated.lectureName
        );
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = {
            ...copy[existingIndex],
            attendanceStatus: 'معذور',
            excuseNote: updated.reason,
          };
          return copy;
        } else {
          const newRecord: StudentAttendanceRecord = {
            id: `ATT-EXC-${Date.now()}`,
            studentCode: updated.studentCode,
            group: 'A',
            name: updated.studentName,
            timestamp: updated.timestamp,
            location: 'عذر طبي / رسمي معتمد',
            lectureName: updated.lectureName,
            startTime: '08:30',
            endTime: '10:30',
            attendanceStatus: 'معذور',
            delayMinutes: 0,
            weekDays: 'الأحد',
            studyType: 'صباحي',
            email: updated.studentEmail,
            college: 'كلية التمريض',
            university: 'جامعة بابل',
            stage: 'المرحلة الثانية',
            lecturerName: 'أستاذ المادة',
            teacherEmail: updated.lecturerEmail,
            lecturePlace: 'قاعة المحاضرة',
            excuseNote: updated.reason,
          };
          return [newRecord, ...prev];
        }
      });
    }
  }, []);

  const isOnline = useOnlineStatus();

  // Sync state to storage
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveLectures(lectures);
  }, [lectures]);

  useEffect(() => {
    saveAttendance(attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Handle logout
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setShowAppSheetGuide(false);
  }, []);

  // User Management (Admin only)
  const handleAddUser = useCallback((newUser: UserAccount) => {
    setUsers((prev) => [newUser, ...prev]);
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleUpdateUser = useCallback((updated: UserAccount) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (currentUser && currentUser.id === updated.id) {
      setCurrentUser(updated);
    }
  }, [currentUser]);

  // 1. Record Attendance by Student (strictly bound to student's own verified identity)
  const handleRecordAttendance = useCallback((record: StudentAttendanceRecord) => {
    if (currentUser?.role === 'student') {
      const securedRecord: StudentAttendanceRecord = {
        ...record,
        studentCode: currentUser.studentCode || record.studentCode,
        name: currentUser.name || record.name,
        email: currentUser.email || record.email,
        stage: currentUser.stage || record.stage,
        group: currentUser.group || record.group,
        college: currentUser.college || record.college,
        university: currentUser.university || record.university,
      };
      setAttendanceRecords((prev) => [securedRecord, ...prev]);
      return;
    }
    setAttendanceRecords((prev) => [record, ...prev]);
  }, [currentUser]);

  // 2. Update Attendance Record:
  // - Admin: can edit any attendance record
  // - Lecturer: can ONLY edit attendance records of their own assigned lectures based on Teacher Email
  // - Student: CANNOT edit any attendance records
  const handleUpdateAttendanceRecord = useCallback((updated: StudentAttendanceRecord) => {
    if (currentUser?.role === 'student') {
      console.warn('Students are not permitted to edit attendance records');
      return;
    }
    if (currentUser?.role === 'lecturer') {
      const userEmail = currentUser.email?.toLowerCase().trim();
      const isMyLecture = lectures.some(
        (l) => l.lectureName === updated.lectureName && l.teacherEmail?.toLowerCase().trim() === userEmail
      ) || updated.teacherEmail?.toLowerCase().trim() === userEmail;

      if (!isMyLecture) {
        console.warn('Lecturer can only update attendance records for their own lectures');
        return;
      }
    }
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  }, [currentUser, lectures]);

  // 3. Delete Attendance Record: ADMIN ONLY
  const handleDeleteAttendanceRecord = useCallback((id: string) => {
    if (currentUser?.role !== 'admin') {
      console.warn('Only admins can delete attendance records');
      return;
    }
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== id));
  }, [currentUser]);

  // 4. Update Lecture:
  // - Admin: full permission to edit any lecture
  // - Lecturer: strictly limited to updating their own assigned lecture based on Teacher Email
  // - Student: NO edit permissions
  const handleUpdateLecture = useCallback((updated: Lecture) => {
    if (currentUser?.role === 'student') {
      console.warn('Students are not permitted to edit lectures');
      return;
    }
    if (currentUser?.role === 'lecturer') {
      const userEmail = currentUser.email?.toLowerCase().trim();
      const lectureEmail = updated.teacherEmail?.toLowerCase().trim();
      if (lectureEmail !== userEmail) {
        console.warn('Lecturer cannot modify lectures assigned to other professors');
        return;
      }
    }
    setLectures((prev) => {
      // If the updated lecture has an active session, deactivate any other lecture for the same teacher
      if (updated.isSessionActive) {
        const teacherEmail = updated.teacherEmail?.toLowerCase().trim();
        return prev.map((l) => {
          if (l.lectureId === updated.lectureId) {
            return updated;
          }
          if (l.teacherEmail?.toLowerCase().trim() === teacherEmail && l.isSessionActive) {
            return { ...l, isSessionActive: false };
          }
          return l;
        });
      }
      return prev.map((l) => (l.lectureId === updated.lectureId ? updated : l));
    });
  }, [currentUser]);

  // 5. Add new Lecture: ADMIN ONLY
  const handleSaveNewLecture = useCallback((newLecture: Lecture) => {
    if (currentUser?.role !== 'admin') {
      console.warn('Only admins can add new lectures to the university schedule');
      return;
    }
    setLectures((prev) => [newLecture, ...prev]);
  }, [currentUser]);

  // 6. Delete Lecture: ADMIN ONLY
  const handleDeleteLecture = useCallback((lectureId: string) => {
    if (currentUser?.role !== 'admin') {
      console.warn('Only admins can delete lectures from the university schedule');
      return;
    }
    setLectures((prev) => prev.filter((l) => l.lectureId !== lectureId));
  }, [currentUser]);

  // Reset to default university data
  const handleResetData = useCallback(() => {
    const res = resetUniversityData();
    setUsers(res.users);
    setLectures(res.lectures);
    setAttendanceRecords(res.records);
    setSettings(res.settings);
  }, []);

  // 1. If not logged in, render the secure Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => setCurrentUser(user)}
        universityName={settings.university}
        collegeName={settings.college}
        users={users}
      />
    );
  }

  // 2. If logged in, render the STRICT role-based interface
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Offline status banner if device disconnects momentarily */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-center gap-2 font-bold sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>أنت تعمل في وضع عدم الاتصال (Offline) — يتم حفظ كافة التسجيلات محلياً على هاتفك.</span>
        </div>
      )}

      {/* Main Header with role-specific items & Logout */}
      <Header
        currentUser={currentUser}
        universityName={settings.university}
        collegeName={settings.college}
        onLogout={handleLogout}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onOpenAppSheetGuide={() => setShowAppSheetGuide(true)}
      />

      {/* Role-Specific Sub-navigation Bar (Hidden completely for students) */}
      {currentUser.role !== 'student' && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 no-print shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs gap-2">
            
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">الجلسة النشطة:</span>
              <span className="font-bold text-slate-900">
                {currentUser.role === 'admin'
                  ? 'لوحة الإدارة والتحكم الشامل (Admin)'
                  : `بوابة الأستاذ المحاضر (${currentUser.name})`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Share Trigger */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>مشاركة التطبيق بالقاعة</span>
              </button>

              {/* Google Sheets Webhook Trigger (Admin only) */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setIsCloudModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-colors ${
                    settings.googleSheetsWebhookUrl
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{settings.googleSheetsWebhookUrl ? 'Google Sheets متصل ✓' : 'ربط Google Sheets'}</span>
                </button>
              )}

              {/* AppSheet Native Guide (Admin only) */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setShowAppSheetGuide(!showAppSheetGuide)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    showAppSheetGuide
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{showAppSheetGuide ? 'العودة للواجهة الرئيسية' : 'دليل وهيكل جداول AppSheet'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Main Content Viewport - Strictly rendered by role */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {showAppSheetGuide && currentUser.role === 'admin' ? (
          <AppSheetGuideModal
            onImportStudents={() => {}}
            onResetData={handleResetData}
            settings={{
              schoolName: settings.university,
              academicYear: '2026 - 2027',
              principalName: 'عميد الكلية',
              supervisorName: 'مدير شؤون الطلبة',
              defaultSession: 'اليوم الكامل',
              whatsappTemplate: '',
            }}
            onUpdateSettings={() => {}}
          />
        ) : (
          <>
            {/* 1. STUDENT VIEW: Simple interface strictly limited to registering attendance and viewing personal history without edit permissions */}
            {currentUser.role === 'student' && (
              <StudentAttendancePortal
                currentUser={currentUser}
                lectures={lectures.filter((l) => 
                  (!l.stage || !currentUser.stage || l.stage === currentUser.stage) &&
                  (!l.group || !currentUser.group || l.group.includes(currentUser.group))
                )}
                attendanceRecords={attendanceRecords.filter((r) => 
                  r.studentCode === currentUser.studentCode ||
                  (r.email && r.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim())
                )}
                onRecordAttendance={handleRecordAttendance}
                settings={settings}
                excuseRequests={excuseRequests.filter((e) => e.studentCode === currentUser.studentCode)}
                onAddExcuseRequest={handleAddExcuseRequest}
              />
            )}

            {/* 2. LECTURER VIEW: Strictly limited to viewing and managing their own lectures and materials based on Teacher Email */}
            {currentUser.role === 'lecturer' && (
              <LecturerPortal
                currentUser={currentUser}
                lectures={lectures.filter((l) => 
                  l.teacherEmail?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()
                )}
                attendanceRecords={attendanceRecords.filter((r) => 
                  r.teacherEmail?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim() ||
                  lectures.some((l) => 
                    l.lectureName === r.lectureName && 
                    l.teacherEmail?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()
                  )
                )}
                onUpdateLecture={handleUpdateLecture}
                onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                onOpenShareModal={() => setIsShareModalOpen(true)}
                excuseRequests={excuseRequests.filter((e) => e.lecturerEmail?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim())}
                onUpdateExcuseRequest={handleUpdateExcuseRequest}
              />
            )}

            {/* 3. ADMIN VIEW: Full permission to view, manage, and edit all data, schedules, users, and records */}
            {currentUser.role === 'admin' && (
              <AdminPortal
                currentUser={currentUser}
                lectures={lectures}
                attendanceRecords={attendanceRecords}
                users={users}
                settings={settings}
                onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
                onDeleteLecture={handleDeleteLecture}
                onUpdateLecture={handleUpdateLecture}
                onOpenCreateLecture={() => setIsCreateLectureOpen(true)}
                onResetData={handleResetData}
                onOpenCloudModal={() => setIsCloudModalOpen(true)}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                onUpdateUser={handleUpdateUser}
                onImportStudents={(newStudents) => setUsers((prev) => [...newStudents, ...prev])}
                onUpdateSettings={setSettings}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>نظام الحضور الذكي الموحد — {settings.college}، {settings.university}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>جلسة: {currentUser.role.toUpperCase()}</span>
            <span>·</span>
            <span>{currentUser.name}</span>
            <span>·</span>
            <button
              onClick={handleLogout}
              className="text-rose-600 hover:underline font-bold"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </footer>

      {/* Create Lecture Modal (Admin only - assignments to lecturers) */}
      <LecturesManagerModal
        isOpen={isCreateLectureOpen}
        onClose={() => setIsCreateLectureOpen(false)}
        onSaveLecture={handleSaveNewLecture}
        currentUser={currentUser}
        lecturers={users.filter((u) => u.role === 'lecturer')}
        defaultCollege={settings.college}
        defaultUniversity={settings.university}
      />

      {/* Share App with Classroom Modal (Admin & Lecturer) */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        collegeName={settings.college}
        universityName={settings.university}
      />

      {/* Google Sheets Live Webhook Settings Modal (Admin) */}
      <GoogleSheetsWebhookModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        sampleRecord={attendanceRecords[0]}
      />

    </div>
  );
}
