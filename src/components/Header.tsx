import React from 'react';
import { UserAccount } from '../types/attendance';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  GraduationCap, 
  ShieldCheck, 
  UserCheck,
  Share2,
  Cloud,
  FileSpreadsheet,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserAccount;
  universityName: string;
  collegeName: string;
  onLogout: () => void;
  onOpenShareModal?: () => void;
  onOpenCloudModal?: () => void;
  onOpenAppSheetGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  universityName,
  collegeName,
  onLogout,
  onOpenShareModal,
  onOpenCloudModal,
  onOpenAppSheetGuide,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Zone 1: Brand title & Emblem */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
              currentUser.role === 'admin'
                ? 'bg-rose-600 shadow-rose-500/20'
                : currentUser.role === 'lecturer'
                ? 'bg-blue-600 shadow-blue-500/20'
                : 'bg-emerald-600 shadow-emerald-500/20'
            }`}>
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : currentUser.role === 'lecturer' ? (
                <GraduationCap className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  نظام حضور المحاضرات
                </span>
                <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded border ${
                  currentUser.role === 'admin'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : currentUser.role === 'lecturer'
                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {currentUser.role === 'admin'
                    ? 'لوحة الإدارة'
                    : currentUser.role === 'lecturer'
                    ? 'بوابة الأستاذ'
                    : 'بوابة الطالب'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                {collegeName} — {universityName}
              </p>
            </div>
          </div>

          {/* Zone 2: Role-Specific Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* PWA Install Button for all users */}
            <PWAInstallButton variant="header" />

            {/* Share app with students QR Modal (for Lecturer and Admin) */}
            {currentUser.role !== 'student' && onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors border border-blue-200"
                title="مشاركة رمز QR لدخول وتثبيت التطبيق على هواتف الطلاب"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">مشاركة التطبيق بالقاعة</span>
              </button>
            )}

            {/* Cloud Google Sheets Webhook Sync Button (Admin Only) */}
            {currentUser.role === 'admin' && onOpenCloudModal && (
              <button
                onClick={onOpenCloudModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
                title="الربط المباشر اللحظي مع Google Sheets"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden lg:inline">ربط Google Sheets</span>
              </button>
            )}

            {/* AppSheet Guide Modal (Admin Only) */}
            {currentUser.role === 'admin' && onOpenAppSheetGuide && (
              <button
                onClick={onOpenAppSheetGuide}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
                title="دليل AppSheet وقوالب CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden xl:inline">دليل وقوالب CSV</span>
              </button>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 pr-1 border-r border-slate-200 mr-1">
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block text-right leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block text-right">
                  {currentUser.role === 'student' ? `كود: ${currentUser.studentCode}` : currentUser.email}
                </span>
              </div>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentUser.role === 'admin'
                    ? 'bg-rose-100 text-rose-800'
                    : currentUser.role === 'lecturer'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentUser.name[0]}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold border border-rose-200 transition-colors"
              title="تسجيل الخروج والعودة لبوابة الدخول"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
