-- ClinicOS Complete PostgreSQL / Supabase Migration & Row Level Security (RLS)
-- Includes normalized tables, atomic daily token generation, private storage policies, and RLS rules

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  mobile_number TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  account_status TEXT NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  qualification TEXT NOT NULL,
  pmdc_number TEXT NOT NULL UNIQUE,
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Approved', 'Rejected')),
  account_status TEXT NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Inactive')),
  consultation_fee INTEGER NOT NULL CHECK (consultation_fee >= 0),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. CLINICS TABLE
CREATE TABLE IF NOT EXISTS public.clinics (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  clinic_address TEXT NOT NULL,
  location TEXT NOT NULL,
  online_booking_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. DOCTOR DOCUMENTS TABLE (Private Verification Bucket Metadata)
CREATE TABLE IF NOT EXISTS public.doctor_documents (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size INTEGER NOT NULL DEFAULT 0,
  file_data TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. APPOINTMENTS TABLE (Unified Daily Token Queue for Online & Walk-In)
CREATE TABLE IF NOT EXISTS public.appointments (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_mobile TEXT NOT NULL,
  token_number INTEGER NOT NULL,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('online', 'walk-in')),
  appointment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'In Progress', 'Completed', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_clinic_date_token UNIQUE (clinic_id, appointment_date, token_number)
);

-- 7. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  expense_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Clinic Rent',
    'Electricity',
    'Gas',
    'Generator',
    'Staff Salaries',
    'Medical Consumables',
    'Internet / Telephone',
    'Marketing',
    'Maintenance',
    'Other'
  )),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  expense_date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 8. PAYMENTS TABLE (Actual Recorded Consultation Revenue)
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  payment_date TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Pending', 'Refunded')),
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 9. ADMIN ACTIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES public.profiles(id),
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id),
  action TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 10. ATOMIC TOKEN GENERATION FUNCTION (Prevents Race Conditions on Same Clinic & Date)
CREATE OR REPLACE FUNCTION public.book_clinic_appointment_atomic(
  p_clinic_id INTEGER,
  p_doctor_id INTEGER,
  p_patient_id INTEGER,
  p_patient_name TEXT,
  p_patient_mobile TEXT,
  p_appointment_type TEXT,
  p_appointment_date TEXT
) RETURNS public.appointments AS $$
DECLARE
  v_online_open BOOLEAN;
  v_doc_status TEXT;
  v_doc_account TEXT;
  v_next_token INTEGER;
  v_inserted public.appointments;
BEGIN
  -- Lock the clinic row to serialize token generation for this clinic
  SELECT c.online_booking_open, d.verification_status, d.account_status
  INTO v_online_open, v_doc_status, v_doc_account
  FROM public.clinics c
  JOIN public.doctors d ON d.id = c.doctor_id
  WHERE c.id = p_clinic_id AND c.doctor_id = p_doctor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic or Doctor not found';
  END IF;

  IF v_doc_status <> 'Approved' OR v_doc_account <> 'Active' THEN
    RAISE EXCEPTION 'Doctor is not currently active for bookings';
  END IF;

  IF p_appointment_type = 'online' AND NOT v_online_open THEN
    RAISE EXCEPTION 'Online booking is currently closed by the clinic';
  END IF;

  SELECT COALESCE(MAX(token_number), 0) + 1
  INTO v_next_token
  FROM public.appointments
  WHERE clinic_id = p_clinic_id AND appointment_date = p_appointment_date;

  INSERT INTO public.appointments (
    clinic_id,
    doctor_id,
    patient_id,
    patient_name,
    patient_mobile,
    token_number,
    appointment_type,
    appointment_date,
    status
  ) VALUES (
    p_clinic_id,
    p_doctor_id,
    p_patient_id,
    p_patient_name,
    p_patient_mobile,
    v_next_token,
    p_appointment_type,
    p_appointment_date,
    'Waiting'
  ) RETURNING * INTO v_inserted;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Public Directory Policy: Anyone can read Approved & Active doctors and their clinics
CREATE POLICY "Public can view approved active doctors" ON public.doctors
  FOR SELECT USING (verification_status = 'Approved' AND account_status = 'Active');

CREATE POLICY "Public can view clinics of approved doctors" ON public.clinics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = clinics.doctor_id
        AND d.verification_status = 'Approved'
        AND d.account_status = 'Active'
    )
  );

-- Doctor Isolation Policy: Doctors can only view/manage their own clinic's appointments, expenses, and payments
CREATE POLICY "Doctors manage own appointments" ON public.appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE d.id = appointments.doctor_id AND p.uid = auth.uid()::text
    )
  );

CREATE POLICY "Doctors manage own expenses" ON public.expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE d.id = expenses.doctor_id AND p.uid = auth.uid()::text
    )
  );

CREATE POLICY "Doctors manage own payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE d.id = payments.doctor_id AND p.uid = auth.uid()::text
    )
  );

-- Patient Isolation Policy: Patients can only read their own appointments
CREATE POLICY "Patients view own appointments" ON public.appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients pat
      JOIN public.profiles p ON p.id = pat.profile_id
      WHERE pat.id = appointments.patient_id AND p.uid = auth.uid()::text
    )
  );

-- Private Doctor Documents Policy: Only uploading doctor and Admin can access verification documents
CREATE POLICY "Doctors and Admins access verification documents" ON public.doctor_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.profiles p ON p.id = d.profile_id
      WHERE d.id = doctor_documents.doctor_id AND p.uid = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.uid = auth.uid()::text AND p.role = 'admin'
    )
  );
