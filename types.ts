
export type FeeFrequency = 'Annual' | 'Semester' | 'Monthly';
export type UserRole = 'Admin' | 'Accountant';

export interface FeeHead {
  id: string;
  course_id?: string;
  name: string;
  amount: number;
  type: 'Base' | 'One-Time' | 'Optional';
}

export interface CourseStructure {
  id: string;
  courseName: string;
  course_name?: string;
  frequency: FeeFrequency;
  heads: FeeHead[];
  totalAmount: number;
  total_amount?: number;
}

export interface Student {
  id: string;
  name: string;
  parentName: string;
  parent_name?: string;
  rollNumber: string;
  roll_number?: string;
  courseId: string;
  course_id?: string;
  branch?: string;
  semester?: string;
  sessionId: string;
  session_id?: string;
  email: string;
  phone: string;
  enrollmentDate: string;
  enrollment_date?: string;
}

export interface Accountant {
  id: string;
  name: string;
  userId: string;
  user_id?: string;
  password: string;
}

export interface AppSettings {
  logoUrl?: string;
  logo_url?: string;
  institutionName: string;
  institution_name?: string;
  address: string;
  contactNumber: string;
  contact_number?: string;
  websiteUrl?: string;
  availableBranches: string[];
  available_branches?: string[];
  availableSemesters: string[];
  available_semesters?: string[];
  availableSessions: string[];
  available_sessions?: string[];
}

export interface Payment {
  id: string;
  studentId: string;
  student_id?: string;
  amount: number;
  date: string;
  time?: string;
  paymentMethod: string;
  payment_method?: string;
  receiptNumber: string;
  receipt_number?: string;
  feeHeadIds: string[];
  fee_head_ids?: string[];
  remarks?: string;
  upiId?: string;
  upi_id?: string;
  transactionId?: string;
  transaction_id?: string;
  bankAccount?: string;
  bank_account?: string;
  sessionId: string;
  session_id?: string;
  collectedBy: string; 
  collected_by?: string;
  editedBy?: string;
  edited_by?: string;
  isEdited?: boolean;
  is_edited?: boolean;
}

export interface PendingChange {
  id: string;
  paymentId: string;
  payment_id?: string;
  requestedBy: string;
  requested_by?: string;
  requestedAt: string;
  requested_at?: string;
  oldData: Partial<Payment>;
  old_data?: Partial<Payment>;
  newData: Partial<Payment>;
  new_data?: Partial<Payment>;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: string;
  type: 'Info' | 'Warning' | 'Alert';
  read: boolean;
}

export interface AppState {
  courses: CourseStructure[];
  students: Student[];
  payments: Payment[];
  accountants: Accountant[];
  settings: AppSettings;
  notifications: AppNotification[];
  pendingChanges: PendingChange[];
  user: { name: string; userId: string; role: UserRole } | null;
}