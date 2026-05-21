// src/types/index.ts

export type UserRole = 'admin' | 'staff' | 'agent' | 'student';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
}

export type ApplicationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'revoked'
  | 'processing'
  | 'pre_admission'
  | 'admitted'
  | 'rejected';

export type WorkStationStatus =
  | 'approved'
  | 'processing'
  | 'pre_admission'
  | 'admitted'
  | 'rejected';

export type DegreeLevel = 'language' | 'diploma' | 'bachelor' | 'master' | 'phd';
export type Priority = 'normal' | 'high';
export type Gender = 'male' | 'female';

export interface UserSummary {
  id?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
}

export interface Student {
  id: string;
  application_number?: string;

  family_name: string;
  given_name: string;
  chinese_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  nationality?: string;

  email?: string;
  mobile?: string;
  whatsapp?: string;
  wechat_id?: string;

  target_university?: string;
  intended_major?: string;
  scholarship_type?: string;
  degree_level?: DegreeLevel;
  intended_start_term?: string;

  passport_number?: string;
  application_status: ApplicationStatus;
  priority: Priority;

  created_at: string;
  updated_at: string;

  assigned_to_name?: string;

  submitted_by_name?: string;
  submitted_by_role?: UserRole;
  submitted_by_email?: string;

  payment_of_application?: string;
  application_incharge?: string;
  university_applied?: string;
  ws_status?: string;
}

export interface StudentAddress {
  id?: string;
  student_id?: string;
  address_type: 'permanent' | 'current';
  country?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
}

export interface StudentPassport {
  id?: string;
  student_id?: string;
  passport_number?: string;
  issuing_country?: string;
  issue_date?: string;
  expiry_date?: string;
  place_of_issue?: string;
  has_china_visa?: boolean;
  visa_type?: string;
  visa_number?: string;
  visa_issue_date?: string;
  visa_expiry_date?: string;
}

export interface FinancialSupporter {
  id?: string;
  student_id?: string;
  supporter_name?: string;
  relationship?: string;
  occupation?: string;
  annual_income_amount?: number | string;
  annual_income_currency?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_holder_name?: string;
  current_balance?: number | string;
}

export interface StudentEducation {
  id?: string;
  student_id?: string;
  institution_name?: string;
  country?: string;
  degree_obtained?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  gpa?: number | string | null;
  is_highest?: boolean;
}

export interface StudentChinaExperience {
  id?: string;
  student_id?: string;
  has_experience?: boolean;
  university_name?: string;
  city?: string;
  start_date?: string;
  end_date?: string;
  program_major?: string;
}

export interface StudentLanguage {
  id?: string;
  student_id?: string;
  language?: string;
  test_name?: string;
  score?: string;
  test_date?: string;
}

export interface StudentWorkExperience {
  id?: string;
  student_id?: string;
  employer?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface StudentDocument {
  id?: string;
  student_id?: string;
  doc_key: string;
  doc_label: string;
  is_required: boolean;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface StudentNote {
  id: string;
  student_id: string;
  note: string;
  created_by: string;
  author?: string;
  created_at: string;
}

export interface StudentDetail {
  student: Student;
  addresses: StudentAddress[];
  passport: StudentPassport | null;
  education: StudentEducation[];
  china: StudentChinaExperience | null;
  financial: FinancialSupporter | null;
  languages: StudentLanguage[];
  work: StudentWorkExperience[];
  documents: StudentDocument[];
  notes: StudentNote[];
}

export interface DashboardStats {
  total: string;
  pending: string;
  approved: string;
  revoked: string;
  processing: string;
  pre_admission: string;
  admitted: string;
  rejected: string;
  documents_verified?: string;
  high_priority: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentListResponse {
  data: Student[];
  pagination: PaginationInfo;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  revoked: 'Revoked',
  processing: 'Processing',
  pre_admission: 'Pre Admission',
  admitted: 'Admitted',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: 'badge badge-draft',
  pending: 'badge badge-pending',
  approved: 'badge badge-approved',
  revoked: 'badge badge-revoked',
  processing: 'badge badge-processing',
  pre_admission: 'badge badge-pre_admission',
  admitted: 'badge badge-admitted',
  rejected: 'badge badge-rejected',
};

export const WORKSTATION_STATUS_LABELS: Record<WorkStationStatus, string> = {
  approved: 'Approved',
  processing: 'Processing',
  pre_admission: 'Pre Admission',
  admitted: 'Admitted',
  rejected: 'Rejected',
};

export const DEGREE_LABELS: Record<DegreeLevel, string> = {
  language: 'Language Course',
  diploma: 'Diploma Degree',
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: 'PhD / Doctorate',
};

export interface Message {
  id: string;
  sender_id: string;
  sender_email: string;
  sender_name?: string;
  recipient_id: string;
  recipient_email: string;
  recipient_name?: string;
  subject?: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  application_id?: string | null;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}