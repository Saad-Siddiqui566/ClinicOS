export type UserRole = 'patient' | 'doctor' | 'admin';

export type VerificationStatus = 'Pending' | 'Approved' | 'Rejected';
export type AccountStatus = 'Active' | 'Inactive';
export type AppointmentStatus = 'Waiting' | 'In Progress' | 'Completed' | 'Cancelled';

export const EXPENSE_CATEGORIES = [
  'Clinic Rent',
  'Electricity',
  'Gas',
  'Generator',
  'Staff Salaries',
  'Medical Consumables',
  'Internet / Telephone',
  'Marketing',
  'Maintenance',
  'Other',
] as const;

export const MEDICAL_SPECIALTIES = [
  'Cardiology',
  'Internal Medicine',
  'Pediatrics & Family Medicine',
  'Dermatology',
  'Orthopedic Surgery',
  'Gynecology & Obstetrics',
  'Neurology',
  'ENT (Otolaryngology)',
  'Ophthalmology',
  'General & Laparoscopic Surgery',
  'Psychiatry',
  'Pulmonology',
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'Bank Transfer',
  'JazzCash / EasyPaisa',
] as const;

export interface DoctorDocumentItem {
  id: number;
  doctorId: number;
  storagePath: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData?: string | null;
  uploadedAt: string;
}

export interface DoctorProfileData {
  id: number;
  profileId: number;
  specialty: string;
  qualification: string;
  pmdcNumber: string;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  consultationFee: number;
  verifiedAt?: string | null;
  verifiedBy?: number | null;
  createdAt: string;
}

export interface ClinicData {
  id: number;
  doctorId: number;
  clinicName: string;
  clinicAddress: string;
  location: string;
  onlineBookingOpen: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  uid: string;
  fullName: string;
  email: string | null;
  mobileNumber: string;
  role: UserRole;
  accountStatus: AccountStatus;
  patientId?: number | null;
  doctor?: DoctorProfileData | null;
  clinic?: ClinicData | null;
  documents?: DoctorDocumentItem[];
}

export interface DirectoryDoctor {
  doctorId: number;
  profileId: number;
  doctorName: string;
  specialty: string;
  qualification: string;
  pmdcNumber: string;
  consultationFee: number;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  clinicId: number;
  clinicName: string;
  clinicAddress: string;
  location: string;
  onlineBookingOpen: boolean;
}

export interface PaymentRecord {
  id: number;
  clinicId: number;
  doctorId: number;
  appointmentId: number;
  amount: number;
  paymentDate: string;
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  paymentMethod: string;
  patientName?: string;
  tokenNumber?: number;
  createdAt?: string;
}

export interface AppointmentRecord {
  id: number;
  clinicId: number;
  doctorId: number;
  patientId: number | null;
  patientName: string;
  patientMobile: string;
  tokenNumber: number;
  appointmentType: 'online' | 'walk-in';
  appointmentDate: string;
  status: AppointmentStatus;
  createdAt: string;
  payment?: PaymentRecord | null;
  // For patient view
  doctorName?: string;
  specialty?: string;
  consultationFee?: number;
  clinicName?: string;
  clinicAddress?: string;
  location?: string;
}

export interface ExpenseRecord {
  id: number;
  clinicId: number;
  doctorId: number;
  expenseName: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes: string | null;
  createdAt: string;
}
