import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Lock,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { MEDICAL_SPECIALTIES } from '../types/clinicos.ts';
import { PublicRoute } from './PublicWebsite.tsx';

interface AuthViewsProps {
  mode: Exclude<PublicRoute, 'home'>;
  onNavigate: (route: PublicRoute) => void;
  onAuthSuccess: () => void;
}

interface UploadedDoc {
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData?: string;
}

export const AuthViews: React.FC<AuthViewsProps> = ({
  mode,
  onNavigate,
  onAuthSuccess,
}) => {
  const { setSession, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setSuccessMessage] = useState<string | null>(null);

  // Patient Signup state
  const [patFullName, setPatFullName] = useState('');
  const [patMobile, setPatMobile] = useState('');
  const [patEmail, setPatEmail] = useState('');
  const [patPassword, setPatPassword] = useState('');

  // Login state (Patient / Doctor / Admin)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Doctor Registration state
  const [docFullName, setDocFullName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docMobile, setDocMobile] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docSpecialty, setDocSpecialty] = useState<string>(MEDICAL_SPECIALTIES[0]);
  const [docQualification, setDocQualification] = useState('');
  const [docPmdcNumber, setDocPmdcNumber] = useState('');
  const [docClinicName, setDocClinicName] = useState('');
  const [docClinicAddress, setDocClinicAddress] = useState('');
  const [docLocation, setDocLocation] = useState('Lahore');
  const [docConsultationFee, setDocConsultationFee] = useState('2500');
  const [docDocuments, setDocDocuments] = useState<UploadedDoc[]>([]);
  const [docApplicationSubmitted, setDocApplicationSubmitted] = useState(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: 'PMDC Registration' | 'Qualification Certificate'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, JPG, PNG, or WEBP documents are accepted.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : undefined;
      setDocDocuments((prev) => {
        const filtered = prev.filter((d) => d.documentType !== documentType);
        return [
          ...filtered,
          {
            documentType,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            fileData: base64,
          },
        ];
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePatientSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!patFullName.trim() || !patMobile.trim() || !patPassword) {
      setError('Please enter your Full Name, Mobile Number, and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/patient/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: patFullName,
          mobileNumber: patMobile,
          email: patEmail || undefined,
          password: patPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create patient account');
      }
      setSession(data.token, data.user);
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (docDocuments.length < 2) {
      setError(
        'Please upload both your PMDC Registration Document and Relevant Qualification Document.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/doctor/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: docFullName,
          email: docEmail,
          mobileNumber: docMobile,
          password: docPassword,
          specialty: docSpecialty,
          qualification: docQualification,
          pmdcNumber: docPmdcNumber,
          clinicName: docClinicName,
          clinicAddress: docClinicAddress,
          location: docLocation,
          consultationFee: Number(docConsultationFee),
          documents: docDocuments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit doctor registration');
      }
      setSession(data.token, data.user);
      setDocApplicationSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent, expectedRole: 'patient' | 'doctor' | 'admin') => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
          role: expectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setSession(data.token, data.user);
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
      setResetStatus({ type: 'success', text: data.message });
    } catch (err: any) {
      setResetStatus({ type: 'error', text: err.message });
    }
  };

  if (docApplicationSubmitted) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col justify-center items-center px-6 py-12">
        <div className="max-w-lg w-full card-surface p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="type-card-title text-[#111827] mb-2">
            Doctor Application Submitted
          </h2>
          <p className="type-body text-[#111827]/75 mb-6">
            Thank you, <strong className="font-semibold text-[#111827]">{docFullName}</strong>. Your clinic registration for{' '}
            <strong className="font-semibold text-[#111827]">{docClinicName}</strong> and your PMDC verification documents have been securely stored in our private verification vault.
          </p>
          <div className="card-surface-navy p-5 text-left mb-6">
            <p className="type-meta text-on-navy-muted mb-1.5">Verification Status · Pending</p>
            <p className="text-sm text-[#FFFFFF]/85 leading-relaxed">
              Our medical administration team will review your PMDC registration (<span className="type-meta text-[#FFFFFF] tabular-nums">{docPmdcNumber}</span>) and qualifications. Once approved, you will have full access to the Doctor Portal and appear in the public patient directory.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onAuthSuccess}
              className="flex-1 py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
            >
              View Application Status Portal
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="py-2.5 px-4 rounded-lg type-btn text-[#111827] bg-[#FFFFFF] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col">
      {/* Top Bar — Midnight Navy (#111827) */}
      <header className="bg-[#111827] text-[#FFFFFF] border-b border-[#FFFFFF]/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[#FFFFFF] cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span>ClinicOS</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 type-nav text-[#FFFFFF]/80 hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#FFFFFF]" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {/* 1. PATIENT SIGNUP */}
        {mode === 'patient-signup' && (
          <div className="max-w-md w-full card-surface p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="type-meta text-[#111827]/65 block mb-0.5">Patient Portal</span>
                <h1 className="type-card-title text-[#111827]">Create Patient Account</h1>
                <p className="text-sm text-[#111827]/70 mt-0.5">
                  Book same-day clinic tokens with PMDC-verified doctors
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePatientSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={patFullName}
                  onChange={(e) => setPatFullName(e.target.value)}
                  placeholder="e.g., Zainab Ahmed"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={patMobile}
                  onChange={(e) => setPatMobile(e.target.value)}
                  placeholder="e.g., 0321-4567890"
                  className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={patEmail}
                  onChange={(e) => setPatEmail(e.target.value)}
                  placeholder="e.g., patient@example.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={patPassword}
                  onChange={(e) => setPatPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover disabled:opacity-50 transition-colors duration-150 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Patient Account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line-light" />
              <span className="text-xs text-[#111827]/55">or</span>
              <div className="h-px flex-1 bg-line-light" />
            </div>

            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  await signInWithGoogle('patient');
                  onAuthSuccess();
                } catch (err: any) {
                  setError(err.message);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg type-btn text-[#111827] bg-[#FFFFFF] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
            >
              Continue with Google Account
            </button>

            <p className="mt-6 text-center text-sm text-[#111827]/75">
              Already have a patient account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onNavigate('patient-login');
                }}
                className="font-semibold text-[#245BFA] hover:underline cursor-pointer"
              >
                Patient Login
              </button>
            </p>
          </div>
        )}

        {/* 2. PATIENT LOGIN */}
        {mode === 'patient-login' && (
          <div className="max-w-md w-full card-surface p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="type-meta text-[#111827]/65 block mb-0.5">Patient Portal</span>
                <h1 className="type-card-title text-[#111827]">Patient Login</h1>
                <p className="text-sm text-[#111827]/70 mt-0.5">
                  Access the Doctor Directory and My Appointments
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e, 'patient')} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Mobile Number or Email *
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="0321-4567890 or zainab@example.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-[#111827]">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(loginIdentifier);
                      setResetStatus(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs font-medium text-[#245BFA] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover disabled:opacity-50 transition-colors duration-150 cursor-pointer"
              >
                {loading ? 'Signing In...' : 'Sign In to Patient Portal'}
              </button>
            </form>

            {/* Quick Fill Demo Patient Account */}
            <div className="mt-5 pt-4 border-t border-line-light">
              <p className="type-meta text-[#111827]/65 mb-2">Quick Test Account</p>
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('0321-4567890');
                  setLoginPassword('Patient@1234');
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 text-left cursor-pointer"
              >
                Fill Demo Patient: Zainab Ahmed (<span className="type-meta tabular-nums">0321-4567890</span>)
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-line-light flex flex-col gap-2 text-center text-sm text-[#111827]/75">
              <p>
                New patient?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    onNavigate('patient-signup');
                  }}
                  className="font-semibold text-[#245BFA] hover:underline cursor-pointer"
                >
                  Create Patient Account
                </button>
              </p>
              <p className="text-xs text-[#111827]/60">
                Are you a doctor?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    onNavigate('doctor-login');
                  }}
                  className="font-semibold text-[#245BFA] hover:underline cursor-pointer"
                >
                  Switch to Doctor Login
                </button>
              </p>
            </div>
          </div>
        )}

        {/* 3. DOCTOR REGISTRATION */}
        {mode === 'doctor-signup' && (
          <div className="max-w-3xl w-full card-surface p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-line-light">
              <div className="w-11 h-11 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <div>
                <span className="type-meta text-[#111827]/65 block mb-0.5">Doctor Portal</span>
                <h1 className="type-card-title text-[#111827]">
                  Doctor &amp; Clinic Registration
                </h1>
                <p className="text-sm text-[#111827]/70 mt-0.5">
                  Submit your PMDC credentials and clinic details for verification
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleDoctorSignup} className="space-y-8">
              {/* Personal Information */}
              <div>
                <h2 className="type-subhead text-[#111827] mb-3.5">
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={docFullName}
                      onChange={(e) => setDocFullName(e.target.value)}
                      placeholder="Dr. Haris Mehmood"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      placeholder="dr.haris@clinicos.pk"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={docMobile}
                      onChange={(e) => setDocMobile(e.target.value)}
                      placeholder="0300-5556677"
                      className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Account Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={docPassword}
                      onChange={(e) => setDocPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="pt-6 border-t border-line-light">
                <h2 className="type-subhead text-[#111827] mb-3.5">
                  Professional Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Medical Specialty *
                    </label>
                    <select
                      value={docSpecialty}
                      onChange={(e) => setDocSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    >
                      {MEDICAL_SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Qualification *
                    </label>
                    <input
                      type="text"
                      required
                      value={docQualification}
                      onChange={(e) => setDocQualification(e.target.value)}
                      placeholder="MBBS, FCPS, MRCP"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      PMDC Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={docPmdcNumber}
                      onChange={(e) => setDocPmdcNumber(e.target.value)}
                      placeholder="PMDC-74920-P"
                      className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                </div>
              </div>

              {/* Clinic Information */}
              <div className="pt-6 border-t border-line-light">
                <h2 className="type-subhead text-[#111827] mb-3.5">
                  Clinic Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Clinic Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={docClinicName}
                      onChange={(e) => setDocClinicName(e.target.value)}
                      placeholder="City Care Medical Center"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-1.5">
                        City / Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={docLocation}
                        onChange={(e) => setDocLocation(e.target.value)}
                        placeholder="Lahore"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-1.5">
                        Consultation Fee (PKR) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={docConsultationFee}
                        onChange={(e) => setDocConsultationFee(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Clinic Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={docClinicAddress}
                      onChange={(e) => setDocClinicAddress(e.target.value)}
                      placeholder="Suite 102, Medical Tower, Jail Road, Lahore"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    />
                  </div>
                </div>
              </div>

              {/* Verification Documents */}
              <div className="pt-6 border-t border-line-light">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h2 className="type-subhead text-[#111827]">
                    Verification Documents (Private Vault)
                  </h2>
                  <span className="type-meta text-[#111827]/60">
                    PDF, JPG, PNG · Max 5MB per file
                  </span>
                </div>
                <p className="text-sm text-[#111827]/70 mb-4">
                  Credential documents are stored with bank-grade privacy and can only be viewed by ClinicOS verification administrators.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PMDC Document */}
                  <div className="border border-dashed border-line-light rounded-xl p-5 bg-[#FFFFFF]">
                    <p className="text-sm font-semibold text-[#111827] mb-1">
                      PMDC Registration Certificate *
                    </p>
                    <p className="text-xs text-[#111827]/65 mb-3">
                      Upload valid PMDC license scan or PDF
                    </p>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer">
                      <FileUp className="w-4 h-4" />
                      <span>Select Document</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleFileChange(e, 'PMDC Registration')}
                        className="hidden"
                      />
                    </label>
                    {docDocuments.find((d) => d.documentType === 'PMDC Registration') && (
                      <div className="mt-3 flex items-center justify-between border border-line-light rounded-lg px-3 py-2">
                        <span className="truncate type-meta text-[#111827]">
                          {docDocuments.find((d) => d.documentType === 'PMDC Registration')?.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDocDocuments((prev) =>
                              prev.filter((d) => d.documentType !== 'PMDC Registration')
                            )
                          }
                          className="text-[#111827]/70 hover:text-[#111827] ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Qualification Certificate */}
                  <div className="border border-dashed border-line-light rounded-xl p-5 bg-[#FFFFFF]">
                    <p className="text-sm font-semibold text-[#111827] mb-1">
                      Qualification Certificate (MBBS / FCPS) *
                    </p>
                    <p className="text-xs text-[#111827]/65 mb-3">
                      Upload medical degree or specialist fellowship
                    </p>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer">
                      <FileUp className="w-4 h-4" />
                      <span>Select Document</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleFileChange(e, 'Qualification Certificate')}
                        className="hidden"
                      />
                    </label>
                    {docDocuments.find((d) => d.documentType === 'Qualification Certificate') && (
                      <div className="mt-3 flex items-center justify-between border border-line-light rounded-lg px-3 py-2">
                        <span className="truncate type-meta text-[#111827]">
                          {
                            docDocuments.find(
                              (d) => d.documentType === 'Qualification Certificate'
                            )?.fileName
                          }
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDocDocuments((prev) =>
                              prev.filter((d) => d.documentType !== 'Qualification Certificate')
                            )
                          }
                          className="text-[#111827]/70 hover:text-[#111827] ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-line-light flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-[#111827]/75">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('doctor-login')}
                    className="font-semibold text-[#245BFA] hover:underline cursor-pointer"
                  >
                    Doctor Login
                  </button>
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                >
                  {loading ? 'Submitting Application...' : 'Submit Doctor Registration'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 4. DOCTOR LOGIN */}
        {mode === 'doctor-login' && (
          <div className="max-w-md w-full card-surface p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-[#FFFFFF]" />
              </div>
              <div>
                <span className="type-meta text-[#111827]/65 block mb-0.5">Doctor Portal</span>
                <h1 className="type-card-title text-[#111827]">Doctor Login</h1>
                <p className="text-sm text-[#111827]/70 mt-0.5">
                  Manage live clinic queue, walk-in tokens, expenses, and financials
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e, 'doctor')} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Email or Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="ayesha@clinicos.pk or 0300-1112233"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-[#111827]">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(loginIdentifier);
                      setResetStatus(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs font-medium text-[#245BFA] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover disabled:opacity-50 transition-colors duration-150 cursor-pointer"
              >
                {loading ? 'Verifying Credentials...' : 'Sign In to Doctor Portal'}
              </button>
            </form>

            {/* Quick Fill Demo Doctor Accounts */}
            <div className="mt-5 pt-4 border-t border-line-light space-y-2">
              <p className="type-meta text-[#111827]/65">Quick Test Accounts</p>
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('ayesha@clinicos.pk');
                  setLoginPassword('Doctor@1234');
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 text-left cursor-pointer"
              >
                Approved Doctor: Dr. Ayesha (<span className="type-meta">ayesha@clinicos.pk</span>)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('bilal@clinicos.pk');
                  setLoginPassword('Doctor@1234');
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#111827]/80 border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 text-left cursor-pointer"
              >
                Pending Doctor: Dr. Bilal (<span className="type-meta">bilal@clinicos.pk</span>)
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-[#111827]/75">
              Want to register your clinic?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onNavigate('doctor-signup');
                }}
                className="font-semibold text-[#245BFA] hover:underline cursor-pointer"
              >
                Register as Doctor
              </button>
            </p>
          </div>
        )}

        {/* 5. ADMIN LOGIN */}
        {mode === 'admin-login' && (
          <div className="max-w-md w-full card-surface p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="type-meta text-[#111827]/65 block mb-0.5">Governance Access</span>
                <h1 className="type-card-title text-[#111827]">Admin Panel Login</h1>
                <p className="text-sm text-[#111827]/70 mt-0.5">
                  Restricted access for ClinicOS Governance &amp; PMDC Verification
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-xl border border-line-light flex items-center gap-2 text-xs text-[#111827]/75">
              <ShieldAlert className="w-4 h-4 text-[#111827] shrink-0" />
              <span>Admin accounts are provisioned strictly through internal governance.</span>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e, 'admin')} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Admin Email or Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="admin@clinicos.pk"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#111827] hover:opacity-90 disabled:opacity-50 transition-opacity duration-150 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-line-light">
              <p className="type-meta text-[#111827]/65 mb-2">Quick Test Administrator</p>
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('admin@clinicos.pk');
                  setLoginPassword('Admin@1234');
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 text-left cursor-pointer"
              >
                Fill Admin Credentials (<span className="type-meta">admin@clinicos.pk</span>)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-surface max-w-md w-full p-6 shadow-xl">
            <h3 className="type-card-title text-[#111827] mb-1">
              Reset Account Password
            </h3>
            <p className="text-sm text-[#111827]/70 mb-4">
              Enter your registered mobile number or email address to set a new password.
            </p>
            {resetStatus && (
              <div
                className={`mb-4 p-3 rounded-xl text-sm border ${
                  resetStatus.type === 'success'
                    ? 'bg-[#245BFA]/10 text-[#111827] border-[#245BFA]/30'
                    : 'bg-[#111827] text-[#FFFFFF] border-[#111827]'
                }`}
              >
                {resetStatus.text}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">
                  Registered Email or Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="0321-4567890 or email@domain.com"
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
