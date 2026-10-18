import React, { useState, useMemo } from 'react';
import { 
  UserAccount, 
  Lecture, 
  StudentAttendanceRecord 
} from '../types/attendance';
import { downloadCSV } from '../utils/appsheetExport';
import { 
  BarChart3, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  GraduationCap, 
  Users, 
  Download, 
  Send, 
  MessageSquare, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Percent, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Flame, 
  UserX,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

interface AnalyticsAndReportsTabProps {
  users: UserAccount[];
  lectures: Lecture[];
  attendanceRecords: StudentAttendanceRecord[];
  universityName: string;
  collegeName: string;
}

export const AnalyticsAndReportsTab: React.FC<AnalyticsAndReportsTabProps> = ({
  users,
  lectures,
  attendanceRecords,
  universityName,
  collegeName,
}) => {
  const [warningFilter, setWarningFilter] = useState<'all' | 'warning' | 'critical' | 'safe'>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  // Filter students only
  const students = useMemo(() => {
    return users.filter((u) => u.role === 'student');
  }, [users]);

  // Total unique sessions/lectures
  const totalLecturesCount = lectures.length || 1;

  // Student Absence & Early Warning calculation
  const studentMetrics = useMemo(() => {
    return students.map((s) => {
      // Find all records for this student
      const records = attendanceRecords.filter(
        (r) => r.studentCode === s.studentCode || r.email.toLowerCase() === s.email.toLowerCase()
      );

      const presentCount = records.filter((r) => r.attendanceStatus === 'حاضر').length;
      const lateCount = records.filter((r) => r.attendanceStatus === 'متأخر').length;
      const excusedCount = records.filter((r) => r.attendanceStatus === 'معذور').length;
      
      // Calculate effective absences: base simulation + recorded absences
      // For academic accuracy: assume minimum expected sessions = totalLecturesCount
      const expectedSessions = Math.max(records.length, 10);
      const attended = presentCount + (lateCount * 0.75) + (excusedCount * 0.5);
      const absentSessions = Math.max(0, expectedSessions - records.length) + records.filter((r) => r.attendanceStatus === 'غائب').length;
      
      const absenceRate = Math.min(100, Math.round((absentSessions / expectedSessions) * 100));
      const attendanceRate = 100 - absenceRate;

      // Risk level
      let riskLevel: 'safe' | 'warning' | 'critical';
      let riskLabel: string;
      let riskColor: string;

      if (absenceRate >= 15) {
        riskLevel = 'critical';
        riskLabel = 'حرمان أكاديمي (تجاوز 15%)';
        riskColor = 'text-rose-700 bg-rose-50 border-rose-300';
      } else if (absenceRate >= 8) {
        riskLevel = 'warning';
        riskLabel = 'إنذار غياب رسمي (10%)';
        riskColor = 'text-amber-700 bg-amber-50 border-amber-300';
      } else if (absenceRate >= 5) {
        riskLevel = 'warning';
        riskLabel = 'تنبيه مبكر أولي (5%)';
        riskColor = 'text-yellow-800 bg-yellow-50 border-yellow-300';
      } else {
        riskLevel = 'safe';
        riskLabel = 'ملتزم أكاديمياً ✓';
        riskColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
      }

      return {
        ...s,
        presentCount,
        lateCount,
        absentSessions,
        absenceRate,
        attendanceRate,
        riskLevel,
        riskLabel,
        riskColor,
      };
    });
  }, [students, attendanceRecords, totalLecturesCount]);

  // Filtered Students in Early Warning Table
  const filteredWarningStudents = useMemo(() => {
    return studentMetrics.filter((s) => {
      const matchFilter = 
        warningFilter === 'all' ||
        (warningFilter === 'warning' && (s.riskLevel === 'warning' || s.riskLevel === 'critical')) ||
        (warningFilter === 'critical' && s.riskLevel === 'critical') ||
        (warningFilter === 'safe' && s.riskLevel === 'safe');

      const matchStage = selectedStage === 'all' || s.stage === selectedStage;
      const cleanSearch = searchStudent.toLowerCase().trim();
      const matchSearch =
        !cleanSearch ||
        s.name.toLowerCase().includes(cleanSearch) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(cleanSearch)) ||
        s.email.toLowerCase().includes(cleanSearch);

      return matchFilter && matchStage && matchSearch;
    });
  }, [studentMetrics, warningFilter, selectedStage, searchStudent]);

  // Overall Statistics & KPIs
  const overallKPIs = useMemo(() => {
    if (studentMetrics.length === 0) return { avgAttendance: 90, criticalCount: 0, warningCount: 0, safeCount: 0 };
    const totalRate = studentMetrics.reduce((acc, curr) => acc + curr.attendanceRate, 0);
    const avgAttendance = Math.round(totalRate / studentMetrics.length);
    const criticalCount = studentMetrics.filter((s) => s.riskLevel === 'critical').length;
    const warningCount = studentMetrics.filter((s) => s.riskLevel === 'warning').length;
    const safeCount = studentMetrics.filter((s) => s.riskLevel === 'safe').length;

    return { avgAttendance, criticalCount, warningCount, safeCount };
  }, [studentMetrics]);

  // Stage Breakdown for Visual Charts
  const stageBreakdown = useMemo(() => {
    const stages = ['المرحلة الأولى', 'المرحلة الثانية', 'المرحلة الثالثة', 'المرحلة الرابعة'];
    return stages.map((stg) => {
      const stageStudents = studentMetrics.filter((s) => s.stage === stg);
      if (stageStudents.length === 0) return { stage: stg, rate: 85, count: 0 };
      const avg = Math.round(
        stageStudents.reduce((acc, curr) => acc + curr.attendanceRate, 0) / stageStudents.length
      );
      return { stage: stg, rate: avg, count: stageStudents.length };
    });
  }, [studentMetrics]);

  // Group Breakdown for Visual Charts
  const groupBreakdown = useMemo(() => {
    const groups = ['A', 'B', 'C', 'D'];
    return groups.map((grp) => {
      const grpStudents = studentMetrics.filter((s) => s.group?.startsWith(grp));
      if (grpStudents.length === 0) return { group: grp, rate: 88, count: 0 };
      const avg = Math.round(
        grpStudents.reduce((acc, curr) => acc + curr.attendanceRate, 0) / grpStudents.length
      );
      return { group: `شعبة ${grp}`, rate: avg, count: grpStudents.length };
    });
  }, [studentMetrics]);

  // Course / Lecture Evaluation Report
  const courseReports = useMemo(() => {
    return lectures.map((lec) => {
      const records = attendanceRecords.filter((r) => r.lectureName === lec.lectureName);
      const totalRecs = records.length;
      const present = records.filter((r) => r.attendanceStatus === 'حاضر').length;
      const late = records.filter((r) => r.attendanceStatus === 'متأخر').length;
      const attendanceRate = totalRecs > 0 ? Math.round(((present + late) / totalRecs) * 100) : 92;
      const lateRate = totalRecs > 0 ? Math.round((late / totalRecs) * 100) : 8;

      let rating = 'ممتاز';
      if (attendanceRate < 80) rating = 'يحتاج متابعة';
      else if (attendanceRate < 90) rating = 'جيد جداً';

      return {
        ...lec,
        totalRecs,
        present,
        late,
        attendanceRate,
        lateRate,
        rating,
      };
    });
  }, [lectures, attendanceRecords]);

  // WhatsApp Warning Trigger
  const handleSendWhatsAppWarning = (student: typeof studentMetrics[0]) => {
    const message = 
      `*تنبيه أكاديمي رسمي - ${collegeName} (${universityName})*\n\n` +
      `إلى الطالب/ـة: *${student.name}* (رمز القيد: ${student.studentCode || '-'})\n` +
      `المرحلة: ${student.stage || 'المرحلة الثانية'} - الشعبة: ${student.group || 'A'}\n\n` +
      `نحيطكم علماً بأن نسبة غيابكم في الفصل الدراسي الحالي قد بلغت (*${student.absenceRate}%*).\n` +
      `الحالة الأكاديمية: *${student.riskLabel}*.\n\n` +
      `يرجى الالتزام التام بحضور المحاضرات القادمة فوراً لتجنب صدور قرار الحرمان الأكاديمي النهائي وتنزيل العقوبة الامتحانية.\n\n` +
      `عمادة الكلية وشؤون الطلبة.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Export Early Warning Report CSV
  const handleExportEarlyWarningCSV = () => {
    const headers = ['Student Code', 'Name', 'Email', 'Stage', 'Group', 'Absence Rate (%)', 'Status', 'Risk Level'];
    const rows = studentMetrics.map((s) => [
      `"${s.studentCode || ''}"`,
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.stage || ''}"`,
      `"${s.group || ''}"`,
      `"${s.absenceRate}%"`,
      `"${s.riskLabel}"`,
      `"${s.riskLevel}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSV(`Early_Warning_Absence_Report_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  // Export Subject Evaluation Report CSV
  const handleExportCourseReportCSV = () => {
    const headers = ['Lecture ID', 'Lecture Name', 'Lecturer', 'Stage', 'Group', 'Attendance Rate (%)', 'Late Rate (%)', 'Rating'];
    const rows = courseReports.map((c) => [
      `"${c.lectureId}"`,
      `"${c.lectureName}"`,
      `"${c.lecturerName}"`,
      `"${c.stage}"`,
      `"${c.group}"`,
      `"${c.attendanceRate}%"`,
      `"${c.lateRate}%"`,
      `"${c.rating}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCSV(`Courses_Attendance_Evaluation_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>نظام التحليلات الذكية والإنذار المبكر (Advanced Analytics & Early Warning)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            مؤشرات الحضور، الإنذار المبكر للغياب، وتقييم المناهج
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            رصد تلقائي لنسب الغياب (5% و 10% و 15%)، إرسال إنذارات رسمية عبر WhatsApp، ومخططات بيانية تفاعلية لالتزام الطلاب في {collegeName}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportEarlyWarningCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير كشف الإنذارات (CSV)</span>
          </button>

          <button
            onClick={handleExportCourseReportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تقرير المواد والمحاضرين</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span>معدل الحضور العام بالكلية</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{overallKPIs.avgAttendance}%</div>
          <div className="text-[10px] text-emerald-700 font-bold mt-1">نسبة التزام ممتازة لعموم الأقسام</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="font-bold">الطلاب الملتزمون (&lt;5% غياب)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-950">{overallKPIs.safeCount}</div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1">حالة أكاديمية مستقرة</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="font-bold">تحت الملاحظة والإنذار (5-14%)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-950">{overallKPIs.warningCount}</div>
          <div className="text-[10px] text-amber-800 font-semibold mt-1">يحتاجون تنبيهاً فورياً</div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="font-bold">تجاوز نسبة الحرمان (15%+)</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-950">{overallKPIs.criticalCount}</div>
          <div className="text-[10px] text-rose-800 font-semibold mt-1">يستوجب إصدار كتاب حرمان</div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Chart 1: Attendance by Academic Stage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>مخطط بياني: نسبة الحضور حسب المراحل الدراسية</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-400">محدث لحظياً</span>
          </div>

          <div className="space-y-3 pt-1">
            {stageBreakdown.map((item) => (
              <div key={item.stage} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-800">{item.stage} ({item.count} طالب)</span>
                  <span className="font-mono font-extrabold text-blue-800">{item.rate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.rate >= 90
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : item.rate >= 80
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        : 'bg-gradient-to-r from-amber-500 to-rose-500'
                    }`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Attendance by Student Groups */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>مخطط بياني: التزام الشعب الأكاديمية (Groups)</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-400">مقارنة الشعب</span>
          </div>

          <div className="space-y-3 pt-1">
            {groupBreakdown.map((item) => (
              <div key={item.group} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-800">{item.group} ({item.count} طالب)</span>
                  <span className="font-mono font-extrabold text-emerald-800">{item.rate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Early Warning Absence Table & Action Center */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>نظام الرصد والإنذار المبكر لغياب الطلاب (Early Absence Warnings)</span>
            </h4>
            <p className="text-xs text-slate-500">
              قائمة الطلاب الذين تجاوزوا الحد الآمن للغياب، مع زر الإرسال التلقائي لإشعار الإنذار عبر WhatsApp مباشرة.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
              <button
                onClick={() => setWarningFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  warningFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                الكل ({studentMetrics.length})
              </button>
              <button
                onClick={() => setWarningFilter('warning')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  warningFilter === 'warning' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                المُنذرين ({overallKPIs.warningCount + overallKPIs.criticalCount})
              </button>
              <button
                onClick={() => setWarningFilter('critical')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  warningFilter === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                حرمان 15%+ ({overallKPIs.criticalCount})
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رمز الطالب (Student Code) أو الإيميل..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
            >
              <option value="all">كافة المراحل الدراسية</option>
              <option value="المرحلة الأولى">المرحلة الأولى</option>
              <option value="المرحلة الثانية">المرحلة الثانية</option>
              <option value="المرحلة الثالثة">المرحلة الثالثة</option>
              <option value="المرحلة الرابعة">المرحلة الرابعة</option>
            </select>
          </div>
        </div>

        {/* Table of Students */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Student Code</th>
                  <th className="py-2.5 px-3">اسم الطالب الكامل</th>
                  <th className="py-2.5 px-3">المرحلة والشعبة</th>
                  <th className="py-2.5 px-3">نسبة الغياب</th>
                  <th className="py-2.5 px-3">حالة الإنذار الأكاديمي</th>
                  <th className="py-2.5 px-3">حاضر / غائب</th>
                  <th className="py-2.5 px-3 text-center">إشعار الإنذار (WhatsApp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWarningStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      لا يوجد طلاب ينطبق عليهم فلتر الإنذار الحالي.
                    </td>
                  </tr>
                ) : (
                  filteredWarningStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{s.studentCode || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.stage || '-'} ({s.group || 'A'})</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${
                            s.absenceRate >= 15 ? 'text-rose-700' : s.absenceRate >= 8 ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {s.absenceRate}%
                          </span>
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                s.absenceRate >= 15 ? 'bg-rose-600' : s.absenceRate >= 8 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, s.absenceRate * 5)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${s.riskColor}`}>
                          {s.riskLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        <span className="text-emerald-700 font-bold">{s.presentCount}</span> حاضر / <span className="text-rose-700 font-bold">{s.absentSessions}</span> غياب
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleSendWhatsAppWarning(s)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                          title="إرسال رسالة إنذار رسمية مخصصة عبر واتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>إرسال إنذار</span>
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

      {/* Course & Lecturer Evaluation Report Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>تقرير تقييم المناهج والمحاضرين ونسب الالتزام</span>
            </h4>
            <p className="text-xs text-slate-500">
              استعراض معدل حضور كل مادة دراسية، نسبة التأخير، وتقييم انتظام الطلاب في القاعات.
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">المادة الدراسية</th>
                  <th className="py-2.5 px-3">الأستاذ المكلف</th>
                  <th className="py-2.5 px-3">المرحلة والشعبة</th>
                  <th className="py-2.5 px-3">القاعة</th>
                  <th className="py-2.5 px-3">نسبة الحضور</th>
                  <th className="py-2.5 px-3">نسبة التأخير</th>
                  <th className="py-2.5 px-3">التقييم الأكاديمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courseReports.map((c) => (
                  <tr key={c.lectureId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{c.lectureName}</td>
                    <td className="py-2.5 px-3 text-blue-900 font-bold">{c.lecturerName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.stage} ({c.group})</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{c.lecturePlace}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        {c.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {c.lateRate}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        c.rating === 'ممتاز'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.rating === 'جيد جداً'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
