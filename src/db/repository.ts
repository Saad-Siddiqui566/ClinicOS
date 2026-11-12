import { and, asc, desc, eq, gte, lte, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adminActions,
  appointments,
  clinics,
  doctorDocuments,
  doctors,
  expenses,
  patients,
  payments,
  profiles,
} from './schema.ts';

export function getClinicLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getProfileById(id: number) {
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.id, id));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getProfileById:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}

export async function getProfileByUid(uid: string) {
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getProfileByUid:', error);
    throw new Error('Failed to fetch user profile by UID.', { cause: error });
  }
}

export async function findProfileByIdentifier(identifier: string, role?: string) {
  try {
    const clean = identifier.trim();
    const conditions = role
      ? and(
          eq(profiles.role, role),
          or(eq(profiles.email, clean), eq(profiles.mobileNumber, clean))
        )
      : or(eq(profiles.email, clean), eq(profiles.mobileNumber, clean));
    const rows = await db.select().from(profiles).where(conditions);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findProfileByIdentifier:', error);
    throw new Error('Failed to look up account credentials.', { cause: error });
  }
}

export async function registerPatientAccount(input: {
  uid: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  passwordHash: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(profiles)
        .where(
          input.email
            ? or(
                eq(profiles.mobileNumber, input.mobileNumber),
                eq(profiles.email, input.email)
              )
            : eq(profiles.mobileNumber, input.mobileNumber)
        );

      if (existing.length > 0) {
        throw new Error('An account with this mobile number or email already exists.');
      }

      const insertedProfiles = await tx
        .insert(profiles)
        .values({
          uid: input.uid,
          fullName: input.fullName,
          email: input.email || null,
          mobileNumber: input.mobileNumber,
          passwordHash: input.passwordHash,
          role: 'patient',
          accountStatus: 'Active',
        })
        .returning();

      const profile = insertedProfiles[0];

      const insertedPatients = await tx
        .insert(patients)
        .values({
          profileId: profile.id,
          accountStatus: 'Active',
        })
        .returning();

      return {
        profile,
        patient: insertedPatients[0],
      };
    });
  } catch (error: any) {
    console.error('Database query failed in registerPatientAccount:', error);
    throw new Error(error.message || 'Failed to register patient account.', { cause: error });
  }
}

export async function registerDoctorApplication(input: {
  uid: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  passwordHash: string;
  specialty: string;
  qualification: string;
  pmdcNumber: string;
  clinicName: string;
  clinicAddress: string;
  location: string;
  consultationFee: number;
  documents: Array<{
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileData?: string;
  }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      const existingProfile = await tx
        .select()
        .from(profiles)
        .where(
          or(
            eq(profiles.email, input.email),
            eq(profiles.mobileNumber, input.mobileNumber)
          )
        );

      if (existingProfile.length > 0) {
        throw new Error('An account with this email or mobile number already exists.');
      }

      const existingPmdc = await tx
        .select()
        .from(doctors)
        .where(eq(doctors.pmdcNumber, input.pmdcNumber));

      if (existingPmdc.length > 0) {
        throw new Error('A doctor with this PMDC Registration Number is already registered.');
      }

      const insertedProfiles = await tx
        .insert(profiles)
        .values({
          uid: input.uid,
          fullName: input.fullName,
          email: input.email,
          mobileNumber: input.mobileNumber,
          passwordHash: input.passwordHash,
          role: 'doctor',
          accountStatus: 'Active',
        })
        .returning();

      const profile = insertedProfiles[0];

      const insertedDoctors = await tx
        .insert(doctors)
        .values({
          profileId: profile.id,
          specialty: input.specialty,
          qualification: input.qualification,
          pmdcNumber: input.pmdcNumber,
          verificationStatus: 'Pending',
          accountStatus: 'Active',
          consultationFee: input.consultationFee,
        })
        .returning();

      const doctor = insertedDoctors[0];

      const insertedClinics = await tx
        .insert(clinics)
        .values({
          doctorId: doctor.id,
          clinicName: input.clinicName,
          clinicAddress: input.clinicAddress,
          location: input.location,
          onlineBookingOpen: true,
        })
        .returning();

      const clinic = insertedClinics[0];

      for (const doc of input.documents) {
        await tx.insert(doctorDocuments).values({
          doctorId: doctor.id,
          storagePath: `private://doctor-verification/${doctor.id}/${doc.fileName}`,
          documentType: doc.documentType,
          fileName: doc.fileName,
          mimeType: doc.mimeType || 'application/pdf',
          fileSize: doc.fileSize || 0,
          fileData: doc.fileData || null,
        });
      }

      return { profile, doctor, clinic };
    });
  } catch (error: any) {
    console.error('Database query failed in registerDoctorApplication:', error);
    throw new Error(error.message || 'Failed to submit doctor registration.', { cause: error });
  }
}

export async function getDoctorContextByProfileId(profileId: number) {
  try {
    const docRows = await db
      .select()
      .from(doctors)
      .where(eq(doctors.profileId, profileId));

    if (!docRows.length) return null;
    const doctor = docRows[0];

    const clinicRows = await db
      .select()
      .from(clinics)
      .where(eq(clinics.doctorId, doctor.id));

    const docs = await db
      .select({
        id: doctorDocuments.id,
        doctorId: doctorDocuments.doctorId,
        storagePath: doctorDocuments.storagePath,
        documentType: doctorDocuments.documentType,
        fileName: doctorDocuments.fileName,
        mimeType: doctorDocuments.mimeType,
        fileSize: doctorDocuments.fileSize,
        uploadedAt: doctorDocuments.uploadedAt,
      })
      .from(doctorDocuments)
      .where(eq(doctorDocuments.doctorId, doctor.id));

    return {
      doctor,
      clinic: clinicRows[0] || null,
      documents: docs,
    };
  } catch (error) {
    console.error('Database query failed in getDoctorContextByProfileId:', error);
    throw new Error('Failed to load doctor clinic context.', { cause: error });
  }
}

export async function getPatientContextByProfileId(profileId: number) {
  try {
    const patRows = await db
      .select()
      .from(patients)
      .where(eq(patients.profileId, profileId));
    return patRows[0] || null;
  } catch (error) {
    console.error('Database query failed in getPatientContextByProfileId:', error);
    throw new Error('Failed to load patient context.', { cause: error });
  }
}

export async function getApprovedActiveDoctorsDirectory() {
  try {
    const rows = await db
      .select({
        doctorId: doctors.id,
        profileId: profiles.id,
        doctorName: profiles.fullName,
        specialty: doctors.specialty,
        qualification: doctors.qualification,
        pmdcNumber: doctors.pmdcNumber,
        consultationFee: doctors.consultationFee,
        verificationStatus: doctors.verificationStatus,
        accountStatus: doctors.accountStatus,
        clinicId: clinics.id,
        clinicName: clinics.clinicName,
        clinicAddress: clinics.clinicAddress,
        location: clinics.location,
        onlineBookingOpen: clinics.onlineBookingOpen,
      })
      .from(doctors)
      .innerJoin(profiles, eq(doctors.profileId, profiles.id))
      .innerJoin(clinics, eq(clinics.doctorId, doctors.id))
      .where(
        and(
          eq(doctors.verificationStatus, 'Approved'),
          eq(doctors.accountStatus, 'Active'),
          eq(profiles.accountStatus, 'Active')
        )
      )
      .orderBy(asc(profiles.fullName));

    return rows;
  } catch (error) {
    console.error('Database query failed in getApprovedActiveDoctorsDirectory:', error);
    throw new Error('Failed to load approved doctors directory.', { cause: error });
  }
}

export async function bookAppointmentAtomic(input: {
  clinicId: number;
  doctorId: number;
  patientId: number | null;
  patientName: string;
  patientMobile: string;
  appointmentType: 'online' | 'walk-in';
  appointmentDate: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      const clinicRows = await tx
        .select()
        .from(clinics)
        .where(
          and(
            eq(clinics.id, input.clinicId),
            eq(clinics.doctorId, input.doctorId)
          )
        );

      if (!clinicRows.length) {
        throw new Error('Selected clinic was not found.');
      }

      const clinic = clinicRows[0];

      const docRows = await tx
        .select()
        .from(doctors)
        .where(eq(doctors.id, input.doctorId));

      if (!docRows.length) {
        throw new Error('Selected doctor was not found.');
      }

      const doctor = docRows[0];

      if (doctor.verificationStatus !== 'Approved' || doctor.accountStatus !== 'Active') {
        throw new Error('Doctor is not currently verified or active for bookings.');
      }

      if (input.appointmentType === 'online' && !clinic.onlineBookingOpen) {
        throw new Error('Online booking is currently closed for this clinic.');
      }

      const existingTokens = await tx
        .select({ tokenNumber: appointments.tokenNumber })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, input.clinicId),
            eq(appointments.appointmentDate, input.appointmentDate)
          )
        )
        .orderBy(desc(appointments.tokenNumber));

      const nextToken =
        existingTokens.length > 0 ? existingTokens[0].tokenNumber + 1 : 1;

      const inserted = await tx
        .insert(appointments)
        .values({
          clinicId: input.clinicId,
          doctorId: input.doctorId,
          patientId: input.patientId,
          patientName: input.patientName.trim(),
          patientMobile: input.patientMobile.trim(),
          tokenNumber: nextToken,
          appointmentType: input.appointmentType,
          appointmentDate: input.appointmentDate,
          status: 'Waiting',
        })
        .returning();

      const docProfile = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, doctor.profileId));

      return {
        appointment: inserted[0],
        clinicName: clinic.clinicName,
        clinicAddress: clinic.clinicAddress,
        location: clinic.location,
        doctorName: docProfile[0]?.fullName || 'Doctor',
        consultationFee: doctor.consultationFee,
      };
    });
  } catch (error: any) {
    console.error('Database query failed in bookAppointmentAtomic:', error);
    throw new Error(error.message || 'Failed to generate appointment token.', { cause: error });
  }
}

export async function getPatientAppointmentsList(patientId: number) {
  try {
    const rows = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        patientName: appointments.patientName,
        patientMobile: appointments.patientMobile,
        appointmentType: appointments.appointmentType,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        createdAt: appointments.createdAt,
        doctorId: doctors.id,
        doctorName: profiles.fullName,
        specialty: doctors.specialty,
        consultationFee: doctors.consultationFee,
        clinicId: clinics.id,
        clinicName: clinics.clinicName,
        clinicAddress: clinics.clinicAddress,
        location: clinics.location,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(profiles, eq(doctors.profileId, profiles.id))
      .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.tokenNumber));

    return rows;
  } catch (error) {
    console.error('Database query failed in getPatientAppointmentsList:', error);
    throw new Error('Failed to fetch patient appointments.', { cause: error });
  }
}

export async function getClinicAppointmentsForDoctor(doctorId: number, clinicId: number) {
  try {
    const apptRows = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.clinicId, clinicId)
        )
      )
      .orderBy(desc(appointments.appointmentDate), asc(appointments.tokenNumber));

    const paymentRows = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.doctorId, doctorId),
          eq(payments.clinicId, clinicId)
        )
      );

    const paymentByApptId = new Map<number, typeof paymentRows[0]>();
    for (const p of paymentRows) {
      paymentByApptId.set(p.appointmentId, p);
    }

    return apptRows.map((a) => ({
      ...a,
      payment: paymentByApptId.get(a.id) || null,
    }));
  } catch (error) {
    console.error('Database query failed in getClinicAppointmentsForDoctor:', error);
    throw new Error('Failed to load clinic appointments.', { cause: error });
  }
}

export async function updateAppointmentStatusForDoctor(input: {
  appointmentId: number;
  doctorId: number;
  clinicId: number;
  status: string;
}) {
  try {
    const updated = await db
      .update(appointments)
      .set({ status: input.status })
      .where(
        and(
          eq(appointments.id, input.appointmentId),
          eq(appointments.doctorId, input.doctorId),
          eq(appointments.clinicId, input.clinicId)
        )
      )
      .returning();

    if (!updated.length) {
      throw new Error('Appointment not found or unauthorized.');
    }
    return updated[0];
  } catch (error: any) {
    console.error('Database query failed in updateAppointmentStatusForDoctor:', error);
    throw new Error(error.message || 'Failed to update appointment status.', { cause: error });
  }
}

export async function toggleClinicOnlineBooking(input: {
  doctorId: number;
  clinicId: number;
  onlineBookingOpen: boolean;
}) {
  try {
    const updated = await db
      .update(clinics)
      .set({ onlineBookingOpen: input.onlineBookingOpen })
      .where(
        and(
          eq(clinics.id, input.clinicId),
          eq(clinics.doctorId, input.doctorId)
        )
      )
      .returning();

    if (!updated.length) {
      throw new Error('Clinic not found or unauthorized.');
    }
    return updated[0];
  } catch (error: any) {
    console.error('Database query failed in toggleClinicOnlineBooking:', error);
    throw new Error(error.message || 'Failed to update online booking availability.', { cause: error });
  }
}

export async function recordConsultationPayment(input: {
  clinicId: number;
  doctorId: number;
  appointmentId: number;
  amount: number;
  paymentDate: string;
  paymentStatus: string;
  paymentMethod: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      const apptRows = await tx
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, input.appointmentId),
            eq(appointments.doctorId, input.doctorId),
            eq(appointments.clinicId, input.clinicId)
          )
        );

      if (!apptRows.length) {
        throw new Error('Appointment does not belong to this clinic.');
      }

      const existing = await tx
        .select()
        .from(payments)
        .where(eq(payments.appointmentId, input.appointmentId));

      if (existing.length > 0) {
        const updated = await tx
          .update(payments)
          .set({
            amount: input.amount,
            paymentDate: input.paymentDate,
            paymentStatus: input.paymentStatus,
            paymentMethod: input.paymentMethod,
          })
          .where(eq(payments.id, existing[0].id))
          .returning();
        return updated[0];
      }

      const inserted = await tx
        .insert(payments)
        .values({
          clinicId: input.clinicId,
          doctorId: input.doctorId,
          appointmentId: input.appointmentId,
          amount: input.amount,
          paymentDate: input.paymentDate,
          paymentStatus: input.paymentStatus,
          paymentMethod: input.paymentMethod,
        })
        .returning();

      return inserted[0];
    });
  } catch (error: any) {
    console.error('Database query failed in recordConsultationPayment:', error);
    throw new Error(error.message || 'Failed to record consultation payment.', { cause: error });
  }
}

export async function getClinicExpenses(doctorId: number, clinicId: number) {
  try {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.doctorId, doctorId),
          eq(expenses.clinicId, clinicId)
        )
      )
      .orderBy(desc(expenses.expenseDate), desc(expenses.id));
  } catch (error) {
    console.error('Database query failed in getClinicExpenses:', error);
    throw new Error('Failed to load clinic expenses.', { cause: error });
  }
}

export async function createClinicExpense(input: {
  clinicId: number;
  doctorId: number;
  expenseName: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}) {
  try {
    const inserted = await db
      .insert(expenses)
      .values({
        clinicId: input.clinicId,
        doctorId: input.doctorId,
        expenseName: input.expenseName.trim(),
        category: input.category,
        amount: input.amount,
        expenseDate: input.expenseDate,
        notes: input.notes?.trim() || null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createClinicExpense:', error);
    throw new Error('Failed to save clinic expense.', { cause: error });
  }
}

export async function updateClinicExpense(input: {
  id: number;
  clinicId: number;
  doctorId: number;
  expenseName: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}) {
  try {
    const updated = await db
      .update(expenses)
      .set({
        expenseName: input.expenseName.trim(),
        category: input.category,
        amount: input.amount,
        expenseDate: input.expenseDate,
        notes: input.notes?.trim() || null,
      })
      .where(
        and(
          eq(expenses.id, input.id),
          eq(expenses.clinicId, input.clinicId),
          eq(expenses.doctorId, input.doctorId)
        )
      )
      .returning();

    if (!updated.length) {
      throw new Error('Expense record not found or unauthorized.');
    }
    return updated[0];
  } catch (error: any) {
    console.error('Database query failed in updateClinicExpense:', error);
    throw new Error(error.message || 'Failed to update expense.', { cause: error });
  }
}

export async function deleteClinicExpense(id: number, doctorId: number, clinicId: number) {
  try {
    const deleted = await db
      .delete(expenses)
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.doctorId, doctorId),
          eq(expenses.clinicId, clinicId)
        )
      )
      .returning();

    if (!deleted.length) {
      throw new Error('Expense record not found or unauthorized.');
    }
    return deleted[0];
  } catch (error: any) {
    console.error('Database query failed in deleteClinicExpense:', error);
    throw new Error(error.message || 'Failed to delete expense.', { cause: error });
  }
}

export async function getClinicFinancialData(input: {
  doctorId: number;
  clinicId: number;
  startDate: string;
  endDate: string;
}) {
  try {
    const paymentRows = await db
      .select({
        id: payments.id,
        appointmentId: payments.appointmentId,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        paymentStatus: payments.paymentStatus,
        paymentMethod: payments.paymentMethod,
        patientName: appointments.patientName,
        tokenNumber: appointments.tokenNumber,
      })
      .from(payments)
      .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(payments.doctorId, input.doctorId),
          eq(payments.clinicId, input.clinicId),
          eq(payments.paymentStatus, 'Paid'),
          gte(payments.paymentDate, input.startDate),
          lte(payments.paymentDate, input.endDate)
        )
      )
      .orderBy(desc(payments.paymentDate));

    const expenseRows = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.doctorId, input.doctorId),
          eq(expenses.clinicId, input.clinicId),
          gte(expenses.expenseDate, input.startDate),
          lte(expenses.expenseDate, input.endDate)
        )
      )
      .orderBy(desc(expenses.expenseDate));

    return {
      payments: paymentRows,
      expenses: expenseRows,
    };
  } catch (error) {
    console.error('Database query failed in getClinicFinancialData:', error);
    throw new Error('Failed to load clinic financial data.', { cause: error });
  }
}

export async function updateDoctorSettings(input: {
  profileId: number;
  doctorId: number;
  clinicId: number;
  fullName: string;
  mobileNumber: string;
  specialty: string;
  qualification: string;
  consultationFee: number;
  clinicName: string;
  clinicAddress: string;
  location: string;
  onlineBookingOpen: boolean;
}) {
  try {
    return await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          fullName: input.fullName.trim(),
          mobileNumber: input.mobileNumber.trim(),
        })
        .where(eq(profiles.id, input.profileId));

      await tx
        .update(doctors)
        .set({
          specialty: input.specialty.trim(),
          qualification: input.qualification.trim(),
          consultationFee: input.consultationFee,
        })
        .where(
          and(
            eq(doctors.id, input.doctorId),
            eq(doctors.profileId, input.profileId)
          )
        );

      await tx
        .update(clinics)
        .set({
          clinicName: input.clinicName.trim(),
          clinicAddress: input.clinicAddress.trim(),
          location: input.location.trim(),
          onlineBookingOpen: input.onlineBookingOpen,
        })
        .where(
          and(
            eq(clinics.id, input.clinicId),
            eq(clinics.doctorId, input.doctorId)
          )
        );

      return true;
    });
  } catch (error) {
    console.error('Database query failed in updateDoctorSettings:', error);
    throw new Error('Failed to update doctor and clinic settings.', { cause: error });
  }
}

export async function updateProfilePassword(profileId: number, newPasswordHash: string) {
  try {
    await db
      .update(profiles)
      .set({ passwordHash: newPasswordHash })
      .where(eq(profiles.id, profileId));
    return true;
  } catch (error) {
    console.error('Database query failed in updateProfilePassword:', error);
    throw new Error('Failed to update password.', { cause: error });
  }
}

export async function getAdminOverviewData() {
  try {
    const allDoctors = await db
      .select({
        doctorId: doctors.id,
        profileId: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        mobileNumber: profiles.mobileNumber,
        specialty: doctors.specialty,
        qualification: doctors.qualification,
        pmdcNumber: doctors.pmdcNumber,
        verificationStatus: doctors.verificationStatus,
        accountStatus: doctors.accountStatus,
        consultationFee: doctors.consultationFee,
        verifiedAt: doctors.verifiedAt,
        verifiedBy: doctors.verifiedBy,
        createdAt: doctors.createdAt,
        clinicId: clinics.id,
        clinicName: clinics.clinicName,
        clinicAddress: clinics.clinicAddress,
        location: clinics.location,
        onlineBookingOpen: clinics.onlineBookingOpen,
      })
      .from(doctors)
      .innerJoin(profiles, eq(doctors.profileId, profiles.id))
      .innerJoin(clinics, eq(clinics.doctorId, doctors.id))
      .orderBy(desc(doctors.createdAt));

    const allDocs = await db.select().from(doctorDocuments);

    const allPatients = await db
      .select({
        patientId: patients.id,
        profileId: profiles.id,
        fullName: profiles.fullName,
        mobileNumber: profiles.mobileNumber,
        email: profiles.email,
        accountStatus: profiles.accountStatus,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .innerJoin(profiles, eq(patients.profileId, profiles.id))
      .orderBy(desc(patients.createdAt));

    const auditActions = await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt));

    const docsByDoctorId = new Map<number, typeof allDocs>();
    for (const d of allDocs) {
      const list = docsByDoctorId.get(d.doctorId) || [];
      list.push(d);
      docsByDoctorId.set(d.doctorId, list);
    }

    const enrichedDoctors = allDoctors.map((doc) => ({
      ...doc,
      documents: docsByDoctorId.get(doc.doctorId) || [],
    }));

    return {
      metrics: {
        totalDoctors: allDoctors.length,
        approvedDoctors: allDoctors.filter((d) => d.verificationStatus === 'Approved').length,
        pendingDoctors: allDoctors.filter((d) => d.verificationStatus === 'Pending').length,
        rejectedDoctors: allDoctors.filter((d) => d.verificationStatus === 'Rejected').length,
        totalPatients: allPatients.length,
      },
      doctors: enrichedDoctors,
      patients: allPatients,
      adminActions: auditActions,
    };
  } catch (error) {
    console.error('Database query failed in getAdminOverviewData:', error);
    throw new Error('Failed to load Admin Panel records.', { cause: error });
  }
}

export async function adminVerifyDoctorDecision(input: {
  adminProfileId: number;
  doctorId: number;
  decision: 'Approved' | 'Rejected';
}) {
  try {
    return await db.transaction(async (tx) => {
      const updated = await tx
        .update(doctors)
        .set({
          verificationStatus: input.decision,
          verifiedAt: new Date(),
          verifiedBy: input.adminProfileId,
        })
        .where(eq(doctors.id, input.doctorId))
        .returning();

      if (!updated.length) {
        throw new Error('Doctor record not found.');
      }

      await tx.insert(adminActions).values({
        adminId: input.adminProfileId,
        doctorId: input.doctorId,
        action: 'Doctor Verification Decision',
        decision: input.decision,
      });

      return updated[0];
    });
  } catch (error: any) {
    console.error('Database query failed in adminVerifyDoctorDecision:', error);
    throw new Error(error.message || 'Failed to update doctor verification status.', {
      cause: error,
    });
  }
}

export async function adminToggleDoctorAccountStatus(input: {
  adminProfileId: number;
  doctorId: number;
  accountStatus: 'Active' | 'Inactive';
}) {
  try {
    return await db.transaction(async (tx) => {
      const docRows = await tx
        .select()
        .from(doctors)
        .where(eq(doctors.id, input.doctorId));

      if (!docRows.length) {
        throw new Error('Doctor not found.');
      }

      const doctor = docRows[0];

      await tx
        .update(doctors)
        .set({ accountStatus: input.accountStatus })
        .where(eq(doctors.id, input.doctorId));

      await tx
        .update(profiles)
        .set({ accountStatus: input.accountStatus })
        .where(eq(profiles.id, doctor.profileId));

      await tx.insert(adminActions).values({
        adminId: input.adminProfileId,
        doctorId: input.doctorId,
        action: 'Doctor Account Status Change',
        decision: input.accountStatus,
      });

      return true;
    });
  } catch (error: any) {
    console.error('Database query failed in adminToggleDoctorAccountStatus:', error);
    throw new Error(error.message || 'Failed to update doctor account status.', {
      cause: error,
    });
  }
}

export async function adminTogglePatientAccountStatus(input: {
  patientId: number;
  accountStatus: 'Active' | 'Inactive';
}) {
  try {
    return await db.transaction(async (tx) => {
      const patRows = await tx
        .select()
        .from(patients)
        .where(eq(patients.id, input.patientId));

      if (!patRows.length) {
        throw new Error('Patient not found.');
      }

      await tx
        .update(patients)
        .set({ accountStatus: input.accountStatus })
        .where(eq(patients.id, input.patientId));

      await tx
        .update(profiles)
        .set({ accountStatus: input.accountStatus })
        .where(eq(profiles.id, patRows[0].profileId));

      return true;
    });
  } catch (error: any) {
    console.error('Database query failed in adminTogglePatientAccountStatus:', error);
    throw new Error(error.message || 'Failed to update patient account status.', {
      cause: error,
    });
  }
}
