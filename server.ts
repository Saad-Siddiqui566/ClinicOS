import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import {
  AuthRequest,
  createSessionToken,
  requireAuth,
  requireRole,
} from './src/middleware/auth.ts';
import {
  adminToggleDoctorAccountStatus,
  adminTogglePatientAccountStatus,
  adminVerifyDoctorDecision,
  bookAppointmentAtomic,
  createClinicExpense,
  deleteClinicExpense,
  findProfileByIdentifier,
  getAdminOverviewData,
  getApprovedActiveDoctorsDirectory,
  getClinicAppointmentsForDoctor,
  getClinicExpenses,
  getClinicFinancialData,
  getClinicLocalDate,
  getDoctorContextByProfileId,
  getPatientAppointmentsList,
  getPatientContextByProfileId,
  getProfileByUid,
  recordConsultationPayment,
  registerDoctorApplication,
  registerPatientAccount,
  toggleClinicOnlineBooking,
  updateAppointmentStatusForDoctor,
  updateClinicExpense,
  updateDoctorSettings,
  updateProfilePassword,
} from './src/db/repository.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // ============================================================================
  // PUBLIC DIRECTORY ROUTES
  // ============================================================================

  app.get('/api/public/doctors', async (_req, res) => {
    try {
      const doctorsList = await getApprovedActiveDoctorsDirectory();
      res.json({
        doctors: doctorsList,
        clinicLocalDate: getClinicLocalDate(),
      });
    } catch (error: any) {
      console.error('Error fetching public doctors directory:', error);
      res.status(500).json({ error: error.message || 'Failed to load doctors directory' });
    }
  });

  // ============================================================================
  // AUTHENTICATION ROUTES (PATIENT, DOCTOR, ADMIN, AND GOOGLE OAUTH)
  // ============================================================================

  // Patient Signup
  app.post('/api/auth/patient/signup', async (req, res) => {
    try {
      const { fullName, mobileNumber, email, password } = req.body;
      if (!fullName || !mobileNumber || !password) {
        return res.status(400).json({
          error: 'Full Name, Mobile Number, and Password are required.',
        });
      }
      if (String(password).length < 6) {
        return res.status(400).json({
          error: 'Password must be at least 6 characters long.',
        });
      }

      const uid = `pat-${crypto.randomUUID()}`;
      const { profile, patient } = await registerPatientAccount({
        uid,
        fullName: String(fullName).trim(),
        mobileNumber: String(mobileNumber).trim(),
        email: email ? String(email).trim() : undefined,
        passwordHash: String(password),
      });

      const token = createSessionToken({
        profileId: profile.id,
        uid: profile.uid,
        role: 'patient',
      });

      res.status(201).json({
        token,
        user: {
          id: profile.id,
          uid: profile.uid,
          fullName: profile.fullName,
          email: profile.email,
          mobileNumber: profile.mobileNumber,
          role: profile.role,
          accountStatus: profile.accountStatus,
          patientId: patient.id,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Patient registration failed' });
    }
  });

  // Doctor Registration (with Verification Documents)
  app.post('/api/auth/doctor/signup', async (req, res) => {
    try {
      const {
        fullName,
        email,
        mobileNumber,
        password,
        specialty,
        qualification,
        pmdcNumber,
        clinicName,
        clinicAddress,
        location,
        consultationFee,
        documents,
      } = req.body;

      if (
        !fullName ||
        !email ||
        !mobileNumber ||
        !password ||
        !specialty ||
        !qualification ||
        !pmdcNumber ||
        !clinicName ||
        !clinicAddress
      ) {
        return res.status(400).json({
          error: 'Please complete all required personal, professional, and clinic fields.',
        });
      }

      const feeNum = Number(consultationFee);
      if (isNaN(feeNum) || feeNum < 0) {
        return res.status(400).json({
          error: 'Please enter a valid Consultation Fee.',
        });
      }

      const docList = Array.isArray(documents) ? documents : [];
      if (docList.length === 0) {
        return res.status(400).json({
          error: 'Please upload your PMDC registration and qualification verification documents.',
        });
      }

      const uid = `doc-${crypto.randomUUID()}`;
      const result = await registerDoctorApplication({
        uid,
        fullName: String(fullName).trim(),
        email: String(email).trim(),
        mobileNumber: String(mobileNumber).trim(),
        passwordHash: String(password),
        specialty: String(specialty).trim(),
        qualification: String(qualification).trim(),
        pmdcNumber: String(pmdcNumber).trim(),
        clinicName: String(clinicName).trim(),
        clinicAddress: String(clinicAddress).trim(),
        location: String(location || clinicAddress.split(',').pop() || 'Lahore').trim(),
        consultationFee: feeNum,
        documents: docList,
      });

      const token = createSessionToken({
        profileId: result.profile.id,
        uid: result.profile.uid,
        role: 'doctor',
      });

      res.status(201).json({
        token,
        user: {
          id: result.profile.id,
          uid: result.profile.uid,
          fullName: result.profile.fullName,
          email: result.profile.email,
          mobileNumber: result.profile.mobileNumber,
          role: 'doctor',
          accountStatus: result.profile.accountStatus,
          doctor: result.doctor,
          clinic: result.clinic,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Doctor registration failed' });
    }
  });

  // Login for Patient, Doctor, or Admin
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password, role } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({
          error: 'Please enter your Email / Mobile Number and Password.',
        });
      }

      const profile = await findProfileByIdentifier(String(identifier), role);
      if (!profile || profile.passwordHash !== String(password)) {
        return res.status(401).json({
          error: 'Invalid credentials. Please verify your email/mobile number and password.',
        });
      }

      if (profile.accountStatus !== 'Active') {
        return res.status(403).json({
          error: 'Your account has been deactivated by an administrator.',
        });
      }

      const token = createSessionToken({
        profileId: profile.id,
        uid: profile.uid,
        role: profile.role as 'patient' | 'doctor' | 'admin',
      });

      if (profile.role === 'doctor') {
        const docContext = await getDoctorContextByProfileId(profile.id);
        return res.json({
          token,
          user: {
            id: profile.id,
            uid: profile.uid,
            fullName: profile.fullName,
            email: profile.email,
            mobileNumber: profile.mobileNumber,
            role: profile.role,
            accountStatus: profile.accountStatus,
            doctor: docContext?.doctor || null,
            clinic: docContext?.clinic || null,
            documents: docContext?.documents || [],
          },
        });
      }

      if (profile.role === 'patient') {
        const pat = await getPatientContextByProfileId(profile.id);
        return res.json({
          token,
          user: {
            id: profile.id,
            uid: profile.uid,
            fullName: profile.fullName,
            email: profile.email,
            mobileNumber: profile.mobileNumber,
            role: profile.role,
            accountStatus: profile.accountStatus,
            patientId: pat?.id || null,
          },
        });
      }

      return res.json({
        token,
        user: {
          id: profile.id,
          uid: profile.uid,
          fullName: profile.fullName,
          email: profile.email,
          mobileNumber: profile.mobileNumber,
          role: profile.role,
          accountStatus: profile.accountStatus,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Authentication failed' });
    }
  });

  // Google Sign-In via Firebase Auth Sync
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken, role = 'patient', mobileNumber } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'Missing Firebase ID token' });
      }
      const decoded = await adminAuth.verifyIdToken(idToken);
      let profile = await getProfileByUid(decoded.uid);

      if (!profile && decoded.email) {
        profile = await findProfileByIdentifier(decoded.email);
      }

      if (!profile) {
        const registered = await registerPatientAccount({
          uid: decoded.uid,
          fullName: decoded.name || decoded.email?.split('@')[0] || 'Patient User',
          email: decoded.email || undefined,
          mobileNumber: mobileNumber || `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
          passwordHash: `oauth-${crypto.randomUUID()}`,
        });
        profile = registered.profile;
      }

      if (profile.accountStatus !== 'Active') {
        return res.status(403).json({
          error: 'Your account has been deactivated by an administrator.',
        });
      }

      const token = createSessionToken({
        profileId: profile.id,
        uid: profile.uid,
        role: (profile.role || role) as 'patient' | 'doctor' | 'admin',
      });

      if (profile.role === 'doctor') {
        const docContext = await getDoctorContextByProfileId(profile.id);
        return res.json({
          token,
          user: {
            ...profile,
            doctor: docContext?.doctor || null,
            clinic: docContext?.clinic || null,
          },
        });
      }

      const pat = await getPatientContextByProfileId(profile.id);
      return res.json({
        token,
        user: {
          ...profile,
          patientId: pat?.id || null,
        },
      });
    } catch (error: any) {
      console.error('Google Auth error:', error);
      res.status(401).json({ error: error.message || 'Google Sign-In verification failed' });
    }
  });

  // Password Reset (Self-service verification via registered mobile + email)
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { identifier, newPassword } = req.body;
      if (!identifier || !newPassword || String(newPassword).length < 6) {
        return res.status(400).json({
          error: 'Provide your registered email/mobile number and a new password (min 6 chars).',
        });
      }
      const profile = await findProfileByIdentifier(String(identifier));
      if (!profile) {
        return res.status(404).json({
          error: 'No account found matching that mobile number or email.',
        });
      }
      await updateProfilePassword(profile.id, String(newPassword));
      res.json({ message: 'Password updated successfully. You may now log in.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Password reset failed' });
    }
  });

  // Current Session Profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const profile = req.authProfile!;
      if (profile.role === 'doctor') {
        const docContext = await getDoctorContextByProfileId(profile.id);
        return res.json({
          user: {
            ...profile,
            doctor: docContext?.doctor || null,
            clinic: docContext?.clinic || null,
            documents: docContext?.documents || [],
          },
        });
      }
      if (profile.role === 'patient') {
        const pat = await getPatientContextByProfileId(profile.id);
        return res.json({
          user: {
            ...profile,
            patientId: pat?.id || null,
          },
        });
      }
      return res.json({ user: profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load user session' });
    }
  });

  // Change Password for Authenticated User
  app.post('/api/auth/change-password', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters long.',
        });
      }
      await updateProfilePassword(req.authProfile!.id, String(newPassword));
      res.json({ message: 'Password changed successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to change password' });
    }
  });

  // ============================================================================
  // PATIENT PORTAL ROUTES
  // ============================================================================

  app.get(
    '/api/patient/appointments',
    requireAuth,
    requireRole(['patient']),
    async (req: AuthRequest, res) => {
      try {
        const pat = await getPatientContextByProfileId(req.authProfile!.id);
        if (!pat) {
          return res.status(404).json({ error: 'Patient record not found' });
        }
        const list = await getPatientAppointmentsList(pat.id);
        res.json({ appointments: list });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to load appointments' });
      }
    }
  );

  app.post(
    '/api/patient/appointments',
    requireAuth,
    requireRole(['patient']),
    async (req: AuthRequest, res) => {
      try {
        const { clinicId, doctorId, patientName, patientMobile } = req.body;
        if (!clinicId || !doctorId || !patientName || !patientMobile) {
          return res.status(400).json({
            error: 'Patient Name and Mobile Number are required to confirm booking.',
          });
        }

        const pat = await getPatientContextByProfileId(req.authProfile!.id);
        if (!pat) {
          return res.status(404).json({ error: 'Patient profile not found.' });
        }

        const today = getClinicLocalDate();
        const booked = await bookAppointmentAtomic({
          clinicId: Number(clinicId),
          doctorId: Number(doctorId),
          patientId: pat.id,
          patientName: String(patientName),
          patientMobile: String(patientMobile),
          appointmentType: 'online',
          appointmentDate: today,
        });

        res.status(201).json(booked);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Booking failed' });
      }
    }
  );

  // ============================================================================
  // DOCTOR PORTAL ROUTES (Requires Approved & Active Doctor)
  // ============================================================================

  const requireApprovedDoctor = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const ctx = await getDoctorContextByProfileId(req.authProfile!.id);
      if (!ctx || !ctx.clinic) {
        return res.status(404).json({ error: 'Doctor or clinic profile not found.' });
      }
      if (ctx.doctor.verificationStatus !== 'Approved') {
        return res.status(403).json({
          error: `Access restricted: Your doctor verification status is currently ${ctx.doctor.verificationStatus}.`,
          verificationStatus: ctx.doctor.verificationStatus,
        });
      }
      if (ctx.doctor.accountStatus !== 'Active') {
        return res.status(403).json({
          error: 'Your doctor account is currently inactive.',
        });
      }
      (req as any).doctorContext = ctx;
      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to verify doctor status' });
    }
  };

  app.get(
    '/api/doctor/appointments',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const list = await getClinicAppointmentsForDoctor(doctor.id, clinic.id);
        res.json({
          appointments: list,
          clinic,
          doctor,
          clinicLocalDate: getClinicLocalDate(),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to load clinic appointments' });
      }
    }
  );

  // Register Physical / Walk-in Appointment (Shares same daily token sequence)
  app.post(
    '/api/doctor/appointments/walk-in',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const { patientName, patientMobile } = req.body;
        if (!patientName || !patientMobile) {
          return res.status(400).json({
            error: 'Patient Name and Mobile Number are required.',
          });
        }

        const today = getClinicLocalDate();
        const booked = await bookAppointmentAtomic({
          clinicId: clinic.id,
          doctorId: doctor.id,
          patientId: null,
          patientName: String(patientName),
          patientMobile: String(patientMobile),
          appointmentType: 'walk-in',
          appointmentDate: today,
        });

        res.status(201).json(booked);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to generate walk-in token' });
      }
    }
  );

  // Update Appointment Status
  app.patch(
    '/api/doctor/appointments/:id/status',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const appointmentId = Number(req.params.id);
        const { status } = req.body;
        const allowed = ['Waiting', 'In Progress', 'Completed', 'Cancelled'];
        if (!allowed.includes(status)) {
          return res.status(400).json({ error: 'Invalid appointment status.' });
        }

        const updated = await updateAppointmentStatusForDoctor({
          appointmentId,
          doctorId: doctor.id,
          clinicId: clinic.id,
          status,
        });
        res.json({ appointment: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update status' });
      }
    }
  );

  // Open / Close Online Booking
  app.patch(
    '/api/doctor/clinic/online-booking',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const { onlineBookingOpen } = req.body;
        const updated = await toggleClinicOnlineBooking({
          doctorId: doctor.id,
          clinicId: clinic.id,
          onlineBookingOpen: Boolean(onlineBookingOpen),
        });
        res.json({ clinic: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to toggle online booking' });
      }
    }
  );

  // Record Consultation Payment
  app.post(
    '/api/doctor/payments',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const { appointmentId, amount, paymentDate, paymentStatus, paymentMethod } = req.body;
        const numAmount = Number(amount);
        if (!appointmentId || isNaN(numAmount) || numAmount < 0) {
          return res.status(400).json({ error: 'Valid appointment and amount are required.' });
        }

        const recorded = await recordConsultationPayment({
          clinicId: clinic.id,
          doctorId: doctor.id,
          appointmentId: Number(appointmentId),
          amount: numAmount,
          paymentDate: paymentDate || getClinicLocalDate(),
          paymentStatus: paymentStatus || 'Paid',
          paymentMethod: paymentMethod || 'Cash',
        });

        res.status(201).json({ payment: recorded });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to record payment' });
      }
    }
  );

  // Expense Management CRUD
  app.get(
    '/api/doctor/expenses',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const list = await getClinicExpenses(doctor.id, clinic.id);
        res.json({ expenses: list });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to load expenses' });
      }
    }
  );

  app.post(
    '/api/doctor/expenses',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const { expenseName, category, amount, expenseDate, notes } = req.body;
        const numAmount = Number(amount);
        if (!expenseName || !category || isNaN(numAmount) || numAmount <= 0 || !expenseDate) {
          return res.status(400).json({
            error: 'Expense Name, Category, valid Amount, and Date are required.',
          });
        }

        const created = await createClinicExpense({
          clinicId: clinic.id,
          doctorId: doctor.id,
          expenseName: String(expenseName),
          category: String(category),
          amount: numAmount,
          expenseDate: String(expenseDate),
          notes: notes ? String(notes) : undefined,
        });
        res.status(201).json({ expense: created });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create expense' });
      }
    }
  );

  app.put(
    '/api/doctor/expenses/:id',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const expenseId = Number(req.params.id);
        const { expenseName, category, amount, expenseDate, notes } = req.body;
        const numAmount = Number(amount);
        if (!expenseName || !category || isNaN(numAmount) || numAmount <= 0 || !expenseDate) {
          return res.status(400).json({
            error: 'Expense Name, Category, valid Amount, and Date are required.',
          });
        }

        const updated = await updateClinicExpense({
          id: expenseId,
          clinicId: clinic.id,
          doctorId: doctor.id,
          expenseName: String(expenseName),
          category: String(category),
          amount: numAmount,
          expenseDate: String(expenseDate),
          notes: notes ? String(notes) : undefined,
        });
        res.json({ expense: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update expense' });
      }
    }
  );

  app.delete(
    '/api/doctor/expenses/:id',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const expenseId = Number(req.params.id);
        await deleteClinicExpense(expenseId, doctor.id, clinic.id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to delete expense' });
      }
    }
  );

  // Financial Dashboard Analytics
  app.get(
    '/api/doctor/financials',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const today = getClinicLocalDate();
        const startDate = String(req.query.startDate || today);
        const endDate = String(req.query.endDate || today);

        const data = await getClinicFinancialData({
          doctorId: doctor.id,
          clinicId: clinic.id,
          startDate,
          endDate,
        });

        const totalRevenue = data.payments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        res.json({
          startDate,
          endDate,
          summary: {
            totalRevenue,
            totalExpenses,
            netProfit,
          },
          payments: data.payments,
          expenses: data.expenses,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to load financial analytics' });
      }
    }
  );

  // Doctor & Clinic Settings Update
  app.put(
    '/api/doctor/settings',
    requireAuth,
    requireRole(['doctor']),
    requireApprovedDoctor,
    async (req: AuthRequest, res) => {
      try {
        const { doctor, clinic } = (req as any).doctorContext;
        const {
          fullName,
          mobileNumber,
          specialty,
          qualification,
          consultationFee,
          clinicName,
          clinicAddress,
          location,
          onlineBookingOpen,
        } = req.body;

        await updateDoctorSettings({
          profileId: req.authProfile!.id,
          doctorId: doctor.id,
          clinicId: clinic.id,
          fullName: String(fullName),
          mobileNumber: String(mobileNumber),
          specialty: String(specialty),
          qualification: String(qualification),
          consultationFee: Number(consultationFee),
          clinicName: String(clinicName),
          clinicAddress: String(clinicAddress),
          location: String(location),
          onlineBookingOpen: Boolean(onlineBookingOpen),
        });

        const refreshed = await getDoctorContextByProfileId(req.authProfile!.id);
        res.json({
          doctor: refreshed?.doctor,
          clinic: refreshed?.clinic,
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update settings' });
      }
    }
  );

  // ============================================================================
  // ADMIN PANEL ROUTES (Strictly Protected Role: admin)
  // ============================================================================

  app.get(
    '/api/admin/overview',
    requireAuth,
    requireRole(['admin']),
    async (_req: AuthRequest, res) => {
      try {
        const data = await getAdminOverviewData();
        res.json(data);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to load admin overview' });
      }
    }
  );

  app.post(
    '/api/admin/doctors/:id/verify',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const doctorId = Number(req.params.id);
        const { decision } = req.body;
        if (decision !== 'Approved' && decision !== 'Rejected') {
          return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
        }

        const updated = await adminVerifyDoctorDecision({
          adminProfileId: req.authProfile!.id,
          doctorId,
          decision,
        });
        res.json({ doctor: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to record verification decision' });
      }
    }
  );

  app.patch(
    '/api/admin/doctors/:id/status',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const doctorId = Number(req.params.id);
        const { accountStatus } = req.body;
        if (accountStatus !== 'Active' && accountStatus !== 'Inactive') {
          return res.status(400).json({ error: 'Account status must be Active or Inactive.' });
        }

        await adminToggleDoctorAccountStatus({
          adminProfileId: req.authProfile!.id,
          doctorId,
          accountStatus,
        });
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update doctor account status' });
      }
    }
  );

  app.patch(
    '/api/admin/patients/:id/status',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthRequest, res) => {
      try {
        const patientId = Number(req.params.id);
        const { accountStatus } = req.body;
        if (accountStatus !== 'Active' && accountStatus !== 'Inactive') {
          return res.status(400).json({ error: 'Account status must be Active or Inactive.' });
        }

        await adminTogglePatientAccountStatus({
          patientId,
          accountStatus,
        });
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update patient account status' });
      }
    }
  );

  // ============================================================================
  // VITE DEV MIDDLEWARE / STATIC ASSETS
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClinicOS full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
