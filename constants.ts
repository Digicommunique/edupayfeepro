
import { AppState, CourseStructure } from './types';

export const INITIAL_COURSES: CourseStructure[] = [
  {
    id: 'c1',
    courseName: 'B.Tech Computer Science',
    frequency: 'Semester',
    totalAmount: 75000,
    heads: [
      { id: 'h1', name: 'Tuition Fee', amount: 60000, type: 'Base' },
      { id: 'h2', name: 'Library & Lab', amount: 10000, type: 'Base' },
      { id: 'h3', name: 'Admission Charges', amount: 5000, type: 'One-Time' }
    ]
  },
  {
    id: 'c2',
    courseName: 'MBA Marketing',
    frequency: 'Annual',
    totalAmount: 250000,
    heads: [
      { id: 'h4', name: 'Annual Tuition', amount: 200000, type: 'Base' },
      { id: 'h5', name: 'Development Fee', amount: 40000, type: 'One-Time' },
      { id: 'h6', name: 'Placement Training', amount: 10000, type: 'Optional' }
    ]
  }
];

export const INITIAL_STATE: AppState = {
  courses: INITIAL_COURSES,
  students: [
    { id: 's1', name: 'Aarav Sharma', parentName: 'Mr. Sunil Sharma', rollNumber: 'BT24001', courseId: 'c1', sessionId: '2024-25', email: 'aarav@outlook.com', phone: '919876543210', enrollmentDate: '2024-07-01', branch: 'CSE', semester: 'I' },
    { id: 's2', name: 'Ishani Gupta', parentName: 'Mr. Alok Gupta', rollNumber: 'MB24105', courseId: 'c2', sessionId: '2024-25', email: 'ishani.g@gmail.com', phone: '918765432109', enrollmentDate: '2024-08-10', branch: 'General', semester: 'I' }
  ],
  payments: [
    { id: 'p1', studentId: 's1', amount: 45000, date: '2024-08-01', paymentMethod: 'Bank Transfer', receiptNumber: 'DC-2024-001', feeHeadIds: ['h1'], collectedBy: 'admin', sessionId: '2024-25' },
    { id: 'p2', studentId: 's2', amount: 150000, date: '2024-09-15', paymentMethod: 'UPI', receiptNumber: 'DC-2024-002', feeHeadIds: ['h4'], collectedBy: 'admin', sessionId: '2024-25' }
  ],
  accountants: [],
  notifications: [],
  pendingChanges: [],
  settings: {
    institutionName: 'Digital Communique Academy',
    address: 'Plot No. 45, Sector 18, Gurugram, Haryana - 122015',
    contactNumber: '+91 124 456 7890',
    availableBranches: ['CSE', 'ME', 'CE', 'ECE', 'MBA', 'BCA'],
    availableSemesters: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
    availableSessions: ['2023-24', '2024-25', '2025-26']
  },
  user: null
};
