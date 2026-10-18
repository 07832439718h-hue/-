import { UserAccount, Lecture, StudentAttendanceRecord, UniversitySettings } from '../types/attendance';
import { DEMO_ACCOUNTS, INITIAL_LECTURES, INITIAL_ATTENDANCE_RECORDS, INITIAL_UNIVERSITY_SETTINGS } from '../data/initialData';

const VERSION_KEY = 'appsheet_univ_data_version';
const CURRENT_VERSION = 'babylon_nursing_2026_v2_auth';

const KEYS = {
  USERS: 'appsheet_univ_users_babylon',
  CURRENT_USER: 'appsheet_univ_current_user_babylon',
  LECTURES: 'appsheet_univ_lectures_babylon',
  ATTENDANCE: 'appsheet_univ_attendance_babylon',
  SETTINGS: 'appsheet_univ_settings_babylon',
};

// Check version and force initialize if previous version existed
const checkVersionMigration = () => {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    if (v !== CURRENT_VERSION) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      saveUsers(DEMO_ACCOUNTS);
      saveLectures(INITIAL_LECTURES);
      saveAttendance(INITIAL_ATTENDANCE_RECORDS);
      saveSettings(INITIAL_UNIVERSITY_SETTINGS);
      // Clear auto-logged-in session so user picks their role on login screen
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  } catch {
    // Ignore storage quota
  }
};

checkVersionMigration();

export const getStoredUsers = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      saveUsers(DEMO_ACCOUNTS);
      return DEMO_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEMO_ACCOUNTS;
  }
};

export const saveUsers = (users: UserAccount[]): void => {
  try {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  } catch (err) {
    console.error(err);
  }
};

export const getCurrentUser = (): UserAccount | null => {
  try {
    const raw = localStorage.getItem(KEYS.CURRENT_USER);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveCurrentUser = (user: UserAccount | null): void => {
  try {
    if (!user) {
      localStorage.removeItem(KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    }
  } catch (err) {
    console.error(err);
  }
};

export const getStoredLectures = (): Lecture[] => {
  try {
    const raw = localStorage.getItem(KEYS.LECTURES);
    if (!raw) {
      saveLectures(INITIAL_LECTURES);
      return INITIAL_LECTURES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LECTURES;
  }
};

export const saveLectures = (lectures: Lecture[]): void => {
  try {
    localStorage.setItem(KEYS.LECTURES, JSON.stringify(lectures));
  } catch (err) {
    console.error(err);
  }
};

export const getStoredAttendance = (): StudentAttendanceRecord[] => {
  try {
    const raw = localStorage.getItem(KEYS.ATTENDANCE);
    if (!raw) {
      saveAttendance(INITIAL_ATTENDANCE_RECORDS);
      return INITIAL_ATTENDANCE_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ATTENDANCE_RECORDS;
  }
};

export const saveAttendance = (records: StudentAttendanceRecord[]): void => {
  try {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
  } catch (err) {
    console.error(err);
  }
};

export const getStoredSettings = (): UniversitySettings => {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      saveSettings(INITIAL_UNIVERSITY_SETTINGS);
      return INITIAL_UNIVERSITY_SETTINGS;
    }
    return { ...INITIAL_UNIVERSITY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_UNIVERSITY_SETTINGS;
  }
};

export const saveSettings = (settings: UniversitySettings): void => {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error(err);
  }
};

export const resetUniversityData = (): {
  users: UserAccount[];
  lectures: Lecture[];
  records: StudentAttendanceRecord[];
  settings: UniversitySettings;
} => {
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  saveUsers(DEMO_ACCOUNTS);
  saveCurrentUser(DEMO_ACCOUNTS[0]);
  saveLectures(INITIAL_LECTURES);
  saveAttendance(INITIAL_ATTENDANCE_RECORDS);
  saveSettings(INITIAL_UNIVERSITY_SETTINGS);

  return {
    users: DEMO_ACCOUNTS,
    lectures: INITIAL_LECTURES,
    records: INITIAL_ATTENDANCE_RECORDS,
    settings: INITIAL_UNIVERSITY_SETTINGS,
  };
};
