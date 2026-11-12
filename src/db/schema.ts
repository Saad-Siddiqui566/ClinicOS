import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  mobileNumber: text('mobile_number').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // 'patient' | 'doctor' | 'admin'
  accountStatus: text('account_status').notNull().default('Active'), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id')
    .references(() => profiles.id)
    .notNull(),
  accountStatus: text('account_status').notNull().default('Active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id')
    .references(() => profiles.id)
    .notNull(),
  specialty: text('specialty').notNull(),
  qualification: text('qualification').notNull(),
  pmdcNumber: text('pmdc_number').notNull().unique(),
  verificationStatus: text('verification_status').notNull().default('Pending'), // 'Pending' | 'Approved' | 'Rejected'
  accountStatus: text('account_status').notNull().default('Active'), // 'Active' | 'Inactive'
  consultationFee: integer('consultation_fee').notNull(),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: integer('verified_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clinics = pgTable('clinics', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  clinicName: text('clinic_name').notNull(),
  clinicAddress: text('clinic_address').notNull(),
  location: text('location').notNull(),
  onlineBookingOpen: boolean('online_booking_open').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctorDocuments = pgTable('doctor_documents', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  storagePath: text('storage_path').notNull(),
  documentType: text('document_type').notNull(), // 'PMDC Registration' | 'Qualification Certificate'
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull().default('application/pdf'),
  fileSize: integer('file_size').notNull().default(0),
  fileData: text('file_data'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    clinicId: integer('clinic_id')
      .references(() => clinics.id)
      .notNull(),
    doctorId: integer('doctor_id')
      .references(() => doctors.id)
      .notNull(),
    patientId: integer('patient_id').references(() => patients.id),
    patientName: text('patient_name').notNull(),
    patientMobile: text('patient_mobile').notNull(),
    tokenNumber: integer('token_number').notNull(),
    appointmentType: text('appointment_type').notNull(), // 'online' | 'walk-in'
    appointmentDate: text('appointment_date').notNull(), // YYYY-MM-DD
    status: text('status').notNull().default('Waiting'), // 'Waiting' | 'In Progress' | 'Completed' | 'Cancelled'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('unique_clinic_date_token').on(
      table.clinicId,
      table.appointmentDate,
      table.tokenNumber
    ),
  ]
);

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id')
    .references(() => clinics.id)
    .notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  expenseName: text('expense_name').notNull(),
  category: text('category').notNull(),
  amount: integer('amount').notNull(),
  expenseDate: text('expense_date').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  clinicId: integer('clinic_id')
    .references(() => clinics.id)
    .notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  appointmentId: integer('appointment_id')
    .references(() => appointments.id)
    .notNull(),
  amount: integer('amount').notNull(),
  paymentDate: text('payment_date').notNull(), // YYYY-MM-DD
  paymentStatus: text('payment_status').notNull().default('Paid'), // 'Paid' | 'Pending' | 'Refunded'
  paymentMethod: text('payment_method').notNull().default('Cash'), // 'Cash' | 'Card' | 'Bank Transfer' | 'JazzCash / EasyPaisa'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminActions = pgTable('admin_actions', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id')
    .references(() => profiles.id)
    .notNull(),
  doctorId: integer('doctor_id')
    .references(() => doctors.id)
    .notNull(),
  action: text('action').notNull(),
  decision: text('decision').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  patients: many(patients),
  doctors: many(doctors),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [doctors.profileId],
    references: [profiles.id],
  }),
  clinics: many(clinics),
  documents: many(doctorDocuments),
  appointments: many(appointments),
  expenses: many(expenses),
  payments: many(payments),
}));

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  doctor: one(doctors, {
    fields: [clinics.doctorId],
    references: [doctors.id],
  }),
  appointments: many(appointments),
  expenses: many(expenses),
  payments: many(payments),
}));
