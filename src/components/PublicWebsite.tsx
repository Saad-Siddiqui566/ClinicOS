import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Stethoscope,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DirectoryDoctor } from '../types/clinicos.ts';
import { cleanText, formatHumanDate, getDoctorInitials } from '../utils/formatters.ts';

export type PublicRoute =
  | 'home'
  | 'patient-signup'
  | 'patient-login'
  | 'doctor-signup'
  | 'doctor-login'
  | 'admin-login';

interface PublicWebsiteProps {
  onNavigate: (route: PublicRoute) => void;
  directoryPreview: DirectoryDoctor[];
  clinicLocalDate: string;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  onNavigate,
  directoryPreview,
  clinicLocalDate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Clinic Owner / Doctor',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const formattedClinicDate = formatHumanDate(clinicLocalDate);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      return;
    }
    setContactSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#111827]">
      {/* Streamlined Top Bar: Pure White (#FFFFFF) Structural Header */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-xs text-[#111827] border-b border-line-light">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5 bg-[#FFFFFF]">
          {/* Zone 1: Brand mark with pulse badge + wordmark */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#111827] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span>ClinicOS</span>
          </button>

          {/* Zone 2: Clean Center Anchor Links */}
          <nav className="hidden md:flex items-center gap-8 type-nav text-[#111827]/75">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#111827] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('available-doctors')}
              className="hover:text-[#111827] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Available Doctors
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('for-clinics')}
              className="hover:text-[#111827] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              For Clinics
            </button>
          </nav>

          {/* Zone 3: Two Uncluttered Right Actions (Log In + Get Started) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('patient-login')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 type-btn text-[#111827] bg-[#FFFFFF] border border-line-light rounded-lg hover:bg-[#111827]/5 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('patient-signup')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#111827] hover:bg-[#111827]/5 rounded-lg transition-colors duration-150"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line-light bg-[#FFFFFF] px-6 py-4 space-y-3">
            <div className="flex flex-col space-y-2 type-nav text-[#111827]/85">
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-1.5 hover:text-[#111827] transition-colors duration-150"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('available-doctors')}
                className="text-left py-1.5 hover:text-[#111827] transition-colors duration-150"
              >
                Available Doctors
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('for-clinics')}
                className="text-left py-1.5 hover:text-[#111827] transition-colors duration-150"
              >
                For Clinics
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="text-left py-1.5 hover:text-[#111827] transition-colors duration-150"
              >
                Contact
              </button>
            </div>
            <div className="pt-3 border-t border-line-light flex gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('patient-login')}
                className="flex-1 py-2.5 px-3 type-btn text-[#111827] bg-[#FFFFFF] border border-line-light rounded-lg text-center whitespace-nowrap"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('patient-signup')}
                className="flex-1 py-2.5 px-3 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg text-center whitespace-nowrap"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* HERO SECTION — Above-the-Fold Optimized */}
        <section className="bg-[#FFFFFF] border-b border-line-light py-10 lg:py-14">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mb-8 lg:mb-10">
              <p className="type-meta text-[#111827] mb-2.5 tabular-nums">
                HEALTHCARE MANAGEMENT PLATFORM · {formattedClinicDate}
              </p>
              <h1 className="type-hero text-[#111827] mb-4">
                Smarter Clinic Operations. <span className="text-[#245BFA]">Simpler Patient Booking.</span>
              </h1>
              <p className="type-body text-[#111827]/75 max-w-[60ch]">
                Connect directly with PMDC-verified specialists for live same-day queue tokens while giving clinics effortless walk-in coordination, expense tracking, and real-time consultation revenue clarity.
              </p>
            </div>

            {/* Two Side-by-Side Portal Cards Fitting Above the Fold */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* FOR PATIENTS CARD */}
              <div className="card-surface p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="type-meta text-[#111827]/60">
                      Patient Portal
                    </span>
                  </div>
                  <h2 className="type-card-title text-[#111827] mb-1.5">
                    For Patients
                  </h2>
                  <p className="type-body text-[#111827]/75 mb-5">
                    Find verified specialists and book your same-day clinic token in seconds.
                  </p>
                  <ul className="space-y-2.5 type-body text-[#111827]/80 mb-6">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#111827] shrink-0 mt-1" />
                      <span>Search PMDC-approved doctors by clinic name, specialty, or city</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#111827] shrink-0 mt-1" />
                      <span>Instant live token number when a clinic opens daily booking</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#111827] shrink-0 mt-1" />
                      <span>Follow your consultation queue status from Waiting to Completed</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-line-light">
                  <button
                    type="button"
                    onClick={() => onNavigate('patient-signup')}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Book Appointment Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('patient-login')}
                    className="type-btn text-[#111827]/75 hover:text-[#111827] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Existing patient? Sign in →
                  </button>
                </div>
              </div>

              {/* FOR DOCTORS CARD — Midnight Navy (#111827) */}
              <div className="card-surface-navy p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-navy-2 text-[#FFFFFF] flex items-center justify-center">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <span className="type-meta text-on-navy-muted">
                      Doctor Portal
                    </span>
                  </div>
                  <h2 className="type-card-title text-[#FFFFFF] mb-1.5">
                    For Doctors &amp; Clinics
                  </h2>
                  <p className="type-body text-on-navy-muted mb-5">
                    Run your daily patient queue, walk-in tokens, and clinic finances in one place.
                  </p>
                  <ul className="space-y-2.5 type-body text-[#FFFFFF]/85 mb-6">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-1" />
                      <span>Single live token queue combining online and walk-in patients</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-1" />
                      <span>One-click control to open or pause same-day online booking</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-1" />
                      <span>Clear daily expense tracking and net profit financial reports</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-[#FFFFFF]/15">
                  <button
                    type="button"
                    onClick={() => onNavigate('doctor-signup')}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Register Your Clinic</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('doctor-login')}
                    className="type-btn text-[#FFFFFF]/80 hover:text-[#FFFFFF] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Doctor Login →
                  </button>
                </div>
              </div>
            </div>

            {/* Verified Directory Strip */}
            {directoryPreview.length > 0 && (
              <div id="available-doctors" className="mt-14 pt-12 border-t border-line-light">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="type-card-title text-[#111827] mb-1">
                      Available Doctors &amp; Verified Clinics
                    </h3>
                    <p className="type-body text-[#111827]/70">
                      PMDC-verified specialists accepting same-day consultations on {formattedClinicDate}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('patient-login')}
                    className="type-btn text-[#245BFA] hover:text-[#111827] transition-colors duration-150 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>View full directory</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {directoryPreview.slice(0, 3).map((doc) => (
                    <div
                      key={doc.doctorId}
                      className="card-surface p-6 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Row: 48px Avatar Badge + Availability Pill */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-[#111827] text-[#FFFFFF] font-display font-semibold text-sm flex items-center justify-center shrink-0">
                            {getDoctorInitials(doc.doctorName)}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                              doc.onlineBookingOpen
                                ? 'bg-[#245BFA]/10 text-[#245BFA]'
                                : 'bg-[#111827]/5 text-[#111827]/65'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                doc.onlineBookingOpen ? 'bg-[#245BFA]' : 'bg-[#111827]/40'
                              }`}
                            />
                            {doc.onlineBookingOpen
                              ? 'Booking Open · Next Token Available'
                              : 'Booking Closed'}
                          </span>
                        </div>

                        <h4 className="type-subhead text-[#111827] mb-0.5">
                          {cleanText(doc.doctorName)}
                        </h4>
                        <p className="text-xs font-medium text-[#111827]/75 mb-1">
                          {cleanText(doc.specialty)} · {cleanText(doc.qualification)}
                        </p>

                        {/* Verified PMDC Number with Checkmark */}
                        <div className="inline-flex items-center gap-1.5 text-xs text-[#111827]/70 mb-4 tabular-nums">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#245BFA] shrink-0" />
                          <span className="font-mono">{doc.pmdcNumber}</span>
                          <span>· Verified</span>
                        </div>

                        <div className="pt-3 border-t border-line-light">
                          <p className="text-sm font-medium text-[#111827]">
                            {cleanText(doc.clinicName)}
                          </p>
                          <p className="text-xs text-[#111827]/65 mt-0.5 mb-4">
                            {cleanText(doc.clinicAddress)} · {cleanText(doc.location)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-line-light flex items-center justify-between">
                        <div>
                          <span className="type-meta-sm text-[#111827]/60 block">
                            Consultation Fee
                          </span>
                          <span className="font-mono text-sm font-semibold text-[#111827] tabular-nums">
                            PKR {doc.consultationFee.toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate('patient-login')}
                          className="px-4 py-2 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Book Token
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* HOW CLINICOS WORKS */}
        <section id="how-it-works" className="py-16 lg:py-20 bg-[#FFFFFF] border-b border-line-light">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="type-section text-[#111827] mb-3">
                How ClinicOS Works
              </h2>
              <p className="type-body text-[#111827]/75">
                Designed around real outpatient clinic workflows where patients want reliable same-day tokens rather than rigid appointments that run hours behind schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card-surface p-6">
                <div className="w-10 h-10 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center mb-5">
                  <UserCheck className="w-5 h-5 text-[#FFFFFF]" />
                </div>
                <h3 className="type-card-title text-[#111827] mb-2">
                  Verified Clinic Onboarding
                </h3>
                <p className="type-body text-[#111827]/75">
                  Doctors register their clinic and submit PMDC registration and specialist certificates. Our medical review team verifies credentials before activating public listings.
                </p>
              </div>

              <div className="card-surface p-6">
                <div className="w-10 h-10 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center mb-5">
                  <Ticket className="w-5 h-5 text-[#FFFFFF]" />
                </div>
                <h3 className="type-card-title text-[#111827] mb-2">
                  Live, Real-Time Token Queue
                </h3>
                <p className="type-body text-[#111827]/75">
                  When a doctor opens online booking for the day, patients reserve their spot immediately. Online and walk-in patients share one unified, conflict-free daily token sequence.
                </p>
              </div>

              <div className="card-surface p-6">
                <div className="w-10 h-10 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center mb-5">
                  <TrendingUp className="w-5 h-5 text-[#FFFFFF]" />
                </div>
                <h3 className="type-card-title text-[#111827] mb-2">
                  Consultation &amp; Financial Ledger
                </h3>
                <p className="type-body text-[#111827]/75">
                  Doctors update live queue statuses, record verified consultation fee payments, track daily clinic expenses across 10 categories, and print clear net-profit statements.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS FOR PATIENTS & BENEFITS FOR DOCTORS */}
        <section id="for-clinics" className="py-16 lg:py-20 bg-[#FFFFFF] border-b border-line-light">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Benefits for Patients */}
              <div className="card-surface p-6 sm:p-8">
                <div className="flex items-center gap-3 pb-4 border-b border-line-light mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="type-card-title text-[#111827]">
                    Benefits for Patients
                  </h2>
                </div>
                <p className="type-body text-[#111827]/75 mb-6">
                  Skip multi-hour waiting room uncertainty and book verified outpatient consultations in seconds.
                </p>
                <div className="divide-y divide-line-light border-t border-line-light">
                  <div className="py-4">
                    <h4 className="type-subhead text-[#111827] mb-1">
                      100% PMDC-Verified Specialists
                    </h4>
                    <p className="type-body text-[#111827]/75">
                      Every listed doctor is reviewed for PMDC registration validity and specialist qualifications.
                    </p>
                  </div>
                  <div className="py-4">
                    <h4 className="type-subhead text-[#111827] mb-1">
                      Guaranteed Same-Day Sequential Token
                    </h4>
                    <p className="type-body text-[#111827]/75">
                      Receive an immediate token number for today&apos;s clinic session as soon as your booking is confirmed.
                    </p>
                  </div>
                  <div className="pt-4">
                    <h4 className="type-subhead text-[#111827] mb-1">
                      Transparent Fees &amp; Clinic Addresses
                    </h4>
                    <p className="type-body text-[#111827]/75">
                      View exact consultation fees, clinic locations, and live online booking status before leaving home.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits for Doctors */}
              <div className="card-surface p-6 sm:p-8">
                <div className="flex items-center gap-3 pb-4 border-b border-line-light mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#FFFFFF]" />
                  </div>
                  <h2 className="type-card-title text-[#111827]">
                    Benefits for Doctors
                  </h2>
                </div>
                <p className="type-body text-[#111827]/75 mb-6">
                  Replace paper token registers, waiting room confusion, and unrecorded cash leakage with one calm operating system.
                </p>
                <div className="divide-y divide-line-light border-t border-line-light">
                  <div className="py-4">
                    <h4 className="type-subhead text-[#111827] mb-1">
                      Unified Online + Walk-In Queue
                    </h4>
                    <p className="type-body text-[#111827]/75">
                      Register walk-in patients at the desk and print token slips that follow the exact same daily sequence as online bookings.
                    </p>
                  </div>
                  <div className="py-4">
                    <h4 className="type-subhead text-[#111827] mb-1">
                      Dedicated Clinic Expense Tracking
                    </h4>
                    <p className="type-body text-[#111827]/75">
                      Record rent, utilities, generator fuel, staff salaries, and medical supplies with daily, monthly, and custom date filters.
                    </p>
                  </div>
                  <div className="pt-4">
                    <h4 className="type-subhead text-[#111827] mb-1">
                      Payment-Backed Financial Clarity
                    </h4>
                    <p className="type-body text-[#111827]/75">
                      Revenue is calculated strictly from verified consultation payments—giving you accurate Net Profit trends and printable statements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE CLINICOS — Midnight Navy (#111827) */}
        <section id="about" className="py-16 lg:py-20 bg-[#111827] text-[#FFFFFF]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mb-12">
              <p className="type-meta text-on-navy-muted mb-2">
                Clinical Governance &amp; Security
              </p>
              <h2 className="type-section text-[#FFFFFF] mb-3">
                Why Choose ClinicOS
              </h2>
              <p className="type-body text-on-navy-muted">
                Built specifically for private clinics and specialist practices that value patient trust, effortless queue coordination, and complete financial privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl bg-navy-2 border border-[#FFFFFF]/10 p-6">
                <ShieldCheck className="w-6 h-6 text-[#FFFFFF] mb-4" />
                <h3 className="type-card-title text-[#FFFFFF] mb-2">
                  Encrypted Medical Records &amp; Bank-Grade Privacy
                </h3>
                <p className="type-body text-on-navy-muted">
                  Strict clinic privacy protections ensure each doctor only accesses their own clinic&apos;s appointments, patient details, and financial records.
                </p>
              </div>

              <div className="rounded-xl bg-navy-2 border border-[#FFFFFF]/10 p-6">
                <Clock className="w-6 h-6 text-[#FFFFFF] mb-4" />
                <h3 className="type-card-title text-[#FFFFFF] mb-2">
                  Doctor-Controlled Availability
                </h3>
                <p className="type-body text-on-navy-muted">
                  Doctors can open or pause same-day online token booking at any moment from their dashboard or clinic settings.
                </p>
              </div>

              <div className="rounded-xl bg-navy-2 border border-[#FFFFFF]/10 p-6">
                <Lock className="w-6 h-6 text-[#FFFFFF] mb-4" />
                <h3 className="type-card-title text-[#FFFFFF] mb-2">
                  Private Document Vault
                </h3>
                <p className="type-body text-on-navy-muted">
                  PMDC certificates and specialist qualifications are stored in a private vault accessible only to authorized verification administrators.
                </p>
              </div>

              <div className="rounded-xl bg-navy-2 border border-[#FFFFFF]/10 p-6">
                <FileText className="w-6 h-6 text-[#FFFFFF] mb-4" />
                <h3 className="type-card-title text-[#FFFFFF] mb-2">
                  Verified Financial Ledger
                </h3>
                <p className="type-body text-on-navy-muted">
                  Every consultation payment and clinic expense is securely recorded with encrypted medical records and bank-grade privacy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="py-16 lg:py-20 bg-[#FFFFFF] border-b border-line-light">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5">
                <h2 className="type-section text-[#111827] mb-3">
                  Contact ClinicOS Support
                </h2>
                <p className="type-body text-[#111827]/75 mb-8">
                  Have questions about onboarding your medical practice, PMDC credential verification, or patient token booking? Reach out to our healthcare operations team.
                </p>

                <div className="space-y-5 type-body text-[#111827]">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-[#111827] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#111827]">Headquarters</p>
                      <p className="text-sm text-[#111827]/75">Healthcare Technology Park, Main Boulevard Gulberg, Lahore</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[#111827] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#111827]">Support Helpline</p>
                      <p className="text-sm text-[#111827]/75 font-mono tabular-nums">+92 (42) 111-254-642</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#111827] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#111827]">Verification &amp; Inquiries</p>
                      <p className="text-sm text-[#111827]/75">support@clinicos.pk</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="card-surface p-6 sm:p-8">
                  {contactSubmitted ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-[#245BFA] mx-auto mb-3" />
                      <h3 className="type-card-title text-[#111827] mb-1">
                        Inquiry Received
                      </h3>
                      <p className="type-body text-[#111827]/75 mb-6">
                        Thank you, {contactForm.name}. Our clinical support desk will respond to {contactForm.email} within 1 business day.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setContactSubmitted(false);
                          setContactForm({
                            name: '',
                            email: '',
                            phone: '',
                            role: 'Clinic Owner / Doctor',
                            message: '',
                          });
                        }}
                        className="px-4 py-2.5 type-btn text-[#111827] bg-[#FFFFFF] border border-line-light rounded-lg hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#111827] mb-1.5">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            placeholder="Dr. Ahmad / Sarah Khan"
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
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            placeholder="name@clinic.pk"
                            className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#111827] mb-1.5">
                            Mobile Number
                          </label>
                          <input
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            placeholder="0300-1234567"
                            className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#111827] mb-1.5">
                            I am inquiring as a
                          </label>
                          <select
                            value={contactForm.role}
                            onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                          >
                            <option value="Clinic Owner / Doctor">Clinic Owner / Doctor</option>
                            <option value="Patient">Patient</option>
                            <option value="Healthcare Administrator">Healthcare Administrator</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">
                          Message *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          placeholder="How can we help you with ClinicOS?"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-6 py-2.5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                      >
                        Submit Inquiry
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-14 bg-[#FFFFFF] border-b border-line-light">
          <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="type-section text-[#111827] mb-2">
                Ready to Modernize Your Clinic Queue or Book Today&apos;s Token?
              </h2>
              <p className="type-body text-[#111827]/75">
                Join ClinicOS today as a Patient to book verified specialists or register your clinic as a Doctor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('patient-signup')}
                className="px-6 py-3 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Get Started as Patient
              </button>
              <button
                type="button"
                onClick={() => onNavigate('doctor-signup')}
                className="px-6 py-3 type-btn text-[#FFFFFF] bg-[#111827] rounded-lg hover:opacity-90 transition-opacity duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Register Your Clinic
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER — Midnight Navy (#111827) Background */}
      <footer className="bg-[#111827] text-[#FFFFFF]/80 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-[#FFFFFF]/15">
            <div>
              <div className="inline-flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span className="font-display text-lg font-bold text-[#FFFFFF] tracking-tight">
                  ClinicOS
                </span>
              </div>
              <p className="text-sm text-on-navy-muted mt-1.5">
                Healthcare Queue &amp; Clinic Financial Management Platform
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 type-nav">
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                onClick={() => onNavigate('admin-login')}
                className="text-[#FFFFFF]/50 hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
              >
                Admin Login
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-navy-muted">
            <p>© {new Date().getFullYear()} ClinicOS Healthcare Systems. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-on-navy-muted" />
              <span>Lahore · Islamabad · Karachi</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Privacy Policy / Terms & Conditions Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-surface max-w-xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-line-light mb-4">
              <h3 className="type-card-title text-[#111827]">
                {legalModal === 'privacy' ? 'ClinicOS Privacy Policy' : 'ClinicOS Terms & Conditions'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1.5 text-[#111827]/70 hover:text-[#111827] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="type-body text-[#111827]/80 space-y-3 max-h-80 overflow-y-auto pr-2">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    <strong>1. Encrypted Medical Records &amp; Bank-Grade Privacy:</strong> ClinicOS protects patient and clinic records with strict access controls. Patient mobile numbers and booking tokens are visible only to the patient and the specific clinic where the appointment was booked.
                  </p>
                  <p>
                    <strong>2. Private Verification Vault:</strong> Doctor PMDC registration certificates and medical qualifications are stored in a private verification vault. They are never publicly accessible and may only be inspected by authorized ClinicOS verification administrators.
                  </p>
                  <p>
                    <strong>3. Financial Confidentiality:</strong> Clinic consultation fee payments and expense records belong exclusively to the respective doctor and clinic.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. Same-Day Token Policy:</strong> Online appointments booked through ClinicOS generate sequential tokens exclusively for the current clinic date when online booking is enabled by the doctor.
                  </p>
                  <p>
                    <strong>2. Doctor Verification Requirement:</strong> All registering doctors must provide authentic PMDC registration numbers and supporting documents. Unverified or inactive accounts cannot accept patient bookings.
                  </p>
                  <p>
                    <strong>3. Accurate Financial Recording:</strong> Consultation revenue and operational expenses logged in ClinicOS are managed directly by the clinic for operational accounting.
                  </p>
                </>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-line-light flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 type-btn text-[#FFFFFF] bg-[#111827] rounded-lg hover:opacity-90 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
