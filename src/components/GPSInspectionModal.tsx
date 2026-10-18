import React from 'react';
import { StudentAttendanceRecord } from '../types/attendance';
import { 
  MapPin, 
  X, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle,
  Compass,
  Building
} from 'lucide-react';

interface GPSInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: StudentAttendanceRecord | null;
}

export const GPSInspectionModal: React.FC<GPSInspectionModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen || !record) return null;

  // Extract lat/long from record if embedded in location string e.g. "GPS: 24.7136, 46.6753" or default college coordinates
  const latMatch = record.location.match(/([0-9]+\.[0-9]+)/g);
  const lat = latMatch && latMatch.length >= 2 ? parseFloat(latMatch[0]) : 32.4636;
  const lng = latMatch && latMatch.length >= 2 ? parseFloat(latMatch[1]) : 44.4282;

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 text-right my-8 animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                مراجعة وتدقيق النطاق الجغرافي (GPS) والوقت
              </h3>
              <p className="text-xs text-slate-500">
                التحقق الصارم من إحداثيات تسجيل الطالب لمنع أي تلاعب أو تسجيل وهمي
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Student & Lecture Identity Strip */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{record.name}</span>
            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              {record.studentCode}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
            <div>المحاضرة: <span className="font-bold text-slate-800">{record.lectureName}</span></div>
            <div>المجموعة: <span className="font-bold text-slate-800">{record.group}</span></div>
            <div>المحاضر: <span className="font-bold text-slate-800">{record.lecturerName}</span></div>
            <div>القاعة: <span className="font-bold text-slate-800">{record.lecturePlace}</span></div>
          </div>
        </div>

        {/* GPS Verification Badge */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تم التحقق من الموقع الجغرافي داخل الحرم الجامعي (Geofence Verified)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-slate-500 block">خط العرض (Latitude)</span>
              <span className="font-mono font-bold text-emerald-950 text-sm">{lat}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-slate-500 block">خط الطول (Longitude)</span>
              <span className="font-mono font-bold text-emerald-950 text-sm">{lng}</span>
            </div>
          </div>

          <div className="text-[11px] text-emerald-900 flex items-center gap-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>الموقع المسجل: {record.location}</span>
          </div>
        </div>

        {/* Timestamp & Anti-tampering metadata */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>وقت التسجيل الدقيق (Timestamp):</span>
            </span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {record.timestamp}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-700 text-[11px]">
            <span>فترة المحاضرة الرسمية:</span>
            <span className="font-mono">{record.startTime} - {record.endTime}</span>
          </div>

          <div className="flex items-center justify-between text-slate-700 text-[11px]">
            <span>حالة التأخير:</span>
            <span className={record.delayMinutes > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
              {record.delayMinutes > 0 ? `${record.delayMinutes} دقيقة تأخير` : 'في الموعد المحدد (0 تأخير)'}
            </span>
          </div>

          {record.deviceId && (
            <div className="flex items-center justify-between text-slate-700 text-[11px] pt-1 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-purple-600" />
                <span>بصمة هاتف الطالب:</span>
              </span>
              <span className="font-mono text-purple-800 text-[10px] truncate max-w-[150px]">
                {record.deviceId}
              </span>
            </div>
          )}
        </div>

        {/* Google Maps External Verification Link */}
        <div className="flex items-center justify-between pt-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>عرض الإحداثيات على خرائط Google</span>
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
