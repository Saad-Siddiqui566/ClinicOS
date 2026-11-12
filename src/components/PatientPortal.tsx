import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarCheck,
  CheckCircle2,
  LogOut,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Stethoscope,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { AppointmentRecord, DirectoryDoctor } from '../types/clinicos.ts';
import {
  cleanText,
  formatHumanDate,
  formatTableDate,
  getDoctorInitials,
} from '../utils/formatters.ts';

function renderStatusBadge(status: string) {
  if (status === 'Waiting') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#245BFA]/10 text-[#245BFA]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#245BFA]" />
        <span>Waiting</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#245BFA] text-[#FFFFFF]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
        <span>In Progress</span>
      </span>
    );
  }
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#111827]/10 text-[#111827]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
        <span>Completed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#111827]/5 text-[#111827]/60">
      <span className="w-1.5 h-1.5 rounded-full bg-[#111827]/40" />
      <span>{status}</span>
    </span>
  );
}

export const PatientPortal: React.FC = () => {
  const { user, logout, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'appointments'>('directory');
  const [doctors, setDoctors] = useState<DirectoryDoctor[]>([]);
  const [clinicLocalDate, setClinicLocalDate] = useState<string>('');
  const [myAppointments, setMyAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Directory filters
  const [searchDoctorName, setSearchDoctorName] = useState('');
  const [searchClinicName, setSearchClinicName] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  // Selected Doctor Profile & Booking Flow
  const [selectedDoctor, setSelectedDoctor] = useState<DirectoryDoctor | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingPatientName, setBookingPatientName] = useState(
    cleanText(user?.fullName || '')
  );
  const [bookingPatientMobile, setBookingPatientMobile] = useState(
    user?.mobileNumber || ''
  );
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    doctorName: string;
    patientName: string;
    clinicName: string;
    clinicAddress: string;
    tokenNumber: number;
    status: string;
    appointmentDate: string;
    consultationFee: number;
  } | null>(null);

  const loadPortalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dirRes, apptRes] = await Promise.all([
        fetch('/api/public/doctors').then((r) => r.json()),
        apiFetch<{ appointments: AppointmentRecord[] }>('/api/patient/appointments'),
      ]);
      setDoctors(dirRes.doctors || []);
      setClinicLocalDate(dirRes.clinicLocalDate || '');
      setMyAppointments(apptRes.appointments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Patient Portal data');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const specialties = Array.from(new Set(doctors.map((d) => d.specialty)));
  const locations = Array.from(new Set(doctors.map((d) => d.location)));

  const filteredDoctors = doctors.filter((doc) => {
    const matchDoc = cleanText(doc.doctorName)
      .toLowerCase()
      .includes(searchDoctorName.trim().toLowerCase());
    const matchClinic = cleanText(doc.clinicName)
      .toLowerCase()
      .includes(searchClinicName.trim().toLowerCase());
    const matchSpec =
      selectedSpecialty === 'All' || doc.specialty === selectedSpecialty;
    const matchLoc =
      selectedLocation === 'All' || doc.location === selectedLocation;
    return matchDoc && matchClinic && matchSpec && matchLoc;
  });

  // Active Waiting or In Progress appointment for Live Tracker
  const activeWaitingAppointment = myAppointments.find(
    (a) => a.status === 'Waiting' || a.status === 'In Progress'
  );

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setBookingError(null);

    if (!bookingPatientName.trim() || !bookingPatientMobile.trim()) {
      setBookingError('Please provide both Patient Name and Mobile Number.');
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await apiFetch<{
        appointment: AppointmentRecord;
        clinicName: string;
        clinicAddress: string;
        doctorName: string;
        consultationFee: number;
      }>('/api/patient/appointments', {
        method: 'POST',
        body: JSON.stringify({
          clinicId: selectedDoctor.clinicId,
          doctorId: selectedDoctor.doctorId,
          patientName: bookingPatientName.trim(),
          patientMobile: bookingPatientMobile.trim(),
        }),
      });

      setBookingConfirmation({
        doctorName: res.doctorName,
        patientName: res.appointment.patientName,
        clinicName: res.clinicName,
        clinicAddress: res.clinicAddress,
        tokenNumber: res.appointment.tokenNumber,
        status: res.appointment.status,
        appointmentDate: res.appointment.appointmentDate,
        consultationFee: res.consultationFee,
      });

      await loadPortalData();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to confirm appointment booking');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col">
      {/* Top Bar: Midnight Navy (#111827) */}
      <header className="sticky top-0 z-30 bg-[#111827] text-[#FFFFFF] border-b border-[#FFFFFF]/10 px-6 py-4 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedDoctor(null);
                setShowBookingForm(false);
                setBookingConfirmation(null);
                setActiveTab('directory');
              }}
              className="inline-flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[#FFFFFF] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </span>
              <span>ClinicOS</span>
            </button>
            <span className="hidden sm:inline type-meta text-on-navy-muted">
              Patient Portal
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setSelectedDoctor(null);
                setShowBookingForm(false);
                setBookingConfirmation(null);
                setActiveTab('directory');
              }}
              className={`pb-1 border-b-2 type-nav transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'directory'
                  ? 'border-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'border-transparent text-[#FFFFFF]/75 hover:text-[#FFFFFF]'
              }`}
            >
              Doctor Directory
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDoctor(null);
                setShowBookingForm(false);
                setBookingConfirmation(null);
                setActiveTab('appointments');
              }}
              className={`pb-1 border-b-2 type-nav transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'appointments'
                  ? 'border-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'border-transparent text-[#FFFFFF]/75 hover:text-[#FFFFFF]'
              }`}
            >
              My Appointments ({myAppointments.length})
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:inline text-xs text-on-navy-muted">
              {cleanText(user?.fullName)} ·{' '}
              <span className="type-meta tabular-nums">{user?.mobileNumber}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-between text-sm no-print">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadPortalData}
              className="px-3.5 py-1.5 type-btn bg-[#245BFA] text-[#FFFFFF] rounded-lg hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* DOCTOR DIRECTORY, PROFILE, AND BOOKING */}
        {activeTab === 'directory' && (
          <div>
            {/* 1A: BOOKING CONFIRMATION VIEW */}
            {bookingConfirmation ? (
              <div className="max-w-xl mx-auto card-surface p-6 sm:p-8">
                <div className="text-center pb-6 border-b border-line-light">
                  <div className="w-12 h-12 rounded-xl bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center mx-auto mb-3 no-print">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="type-meta text-[#111827]/65 mb-2">
                    Same-Day Token Confirmed
                  </p>
                  <div className="inline-flex items-center px-5 py-1.5 rounded-full bg-[#245BFA]/10 text-[#245BFA] font-mono text-2xl font-bold tabular-nums mb-2">
                    #{bookingConfirmation.tokenNumber}
                  </div>
                  <p className="type-meta text-[#111827]/65 mt-1 tabular-nums">
                    {formatHumanDate(bookingConfirmation.appointmentDate)}
                  </p>
                </div>

                <div className="py-6 space-y-3.5 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-line-light">
                    <span className="text-[#111827]/65">Doctor Name</span>
                    <span className="font-semibold text-[#111827]">
                      {cleanText(bookingConfirmation.doctorName)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-line-light">
                    <span className="text-[#111827]/65">Patient Name</span>
                    <span className="font-semibold text-[#111827]">
                      {cleanText(bookingConfirmation.patientName)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-line-light">
                    <span className="text-[#111827]/65">Clinic Name</span>
                    <span className="font-semibold text-[#111827]">
                      {cleanText(bookingConfirmation.clinicName)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-line-light">
                    <span className="text-[#111827]/65">Token Number</span>
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-[#111827] text-[#FFFFFF] font-mono text-xs font-semibold tabular-nums">
                      #{bookingConfirmation.tokenNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-line-light">
                    <span className="text-[#111827]/65">Booking Status</span>
                    {renderStatusBadge(bookingConfirmation.status)}
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#111827]/65">Consultation Fee</span>
                    <span className="font-semibold text-[#111827] tabular-nums">
                      PKR {bookingConfirmation.consultationFee.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line-light flex flex-wrap items-center gap-3 no-print">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 type-btn text-[#111827] border border-line-light rounded-lg hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#111827]" />
                    <span>Print Token Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingConfirmation(null);
                      setShowBookingForm(false);
                      setSelectedDoctor(null);
                      setActiveTab('appointments');
                    }}
                    className="flex-1 py-2.5 px-4 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 text-center cursor-pointer"
                  >
                    View in My Appointments
                  </button>
                </div>
              </div>
            ) : selectedDoctor ? (
              /* 1B: DOCTOR PROFILE & SAME-DAY APPOINTMENT BOOKING VIEW */
              <div className="max-w-3xl mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoctor(null);
                    setShowBookingForm(false);
                    setBookingError(null);
                  }}
                  className="mb-6 inline-flex items-center gap-2 type-nav text-[#111827]/75 hover:text-[#111827] transition-colors duration-150 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#111827]" />
                  <span>Back to Doctor Directory</span>
                </button>

                <div className="card-surface p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-line-light">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#111827] text-[#FFFFFF] font-display font-semibold text-sm flex items-center justify-center shrink-0">
                        {getDoctorInitials(selectedDoctor.doctorName)}
                      </div>
                      <div>
                        <div className="text-xs text-[#111827]/70 mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-[#111827]">
                            {cleanText(selectedDoctor.specialty)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#245BFA] shrink-0" />
                            <span>{selectedDoctor.pmdcNumber}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>PMDC Verified</span>
                        </div>
                        <h1 className="type-card-title text-[#111827] mb-1">
                          {cleanText(selectedDoctor.doctorName)}
                        </h1>
                        <p className="type-body text-[#111827]/75">
                          {cleanText(selectedDoctor.qualification)}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span className="text-xs text-[#111827]/65 block mb-1">
                        Consultation Fee
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#111827] tabular-nums">
                        PKR {selectedDoctor.consultationFee.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-line-light">
                    <div>
                      <h3 className="text-xs font-medium text-[#111827]/65 mb-1">
                        Clinic Name
                      </h3>
                      <p className="type-subhead text-[#111827]">
                        {cleanText(selectedDoctor.clinicName)}
                      </p>
                      <p className="text-sm text-[#111827]/75 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#111827]/65 shrink-0" />
                        <span>
                          {cleanText(selectedDoctor.clinicAddress)} ({cleanText(selectedDoctor.location)})
                        </span>
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xs font-medium text-[#111827]/65 mb-1.5">
                        Today&apos;s Queue Availability
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          selectedDoctor.onlineBookingOpen
                            ? 'bg-[#245BFA]/10 text-[#245BFA]'
                            : 'bg-[#111827]/5 text-[#111827]/65'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedDoctor.onlineBookingOpen ? 'bg-[#245BFA]' : 'bg-[#111827]/40'
                          }`}
                        />
                        {selectedDoctor.onlineBookingOpen
                          ? 'Booking Open · Next Token Available'
                          : 'Booking Closed'}
                      </span>
                      <p className="text-xs text-[#111827]/65 mt-2">
                        Live, real-time token queue for {formatHumanDate(clinicLocalDate)}
                      </p>
                    </div>
                  </div>

                  {/* Book Appointment Action or Form */}
                  <div className="pt-6">
                    {!selectedDoctor.onlineBookingOpen ? (
                      <div className="p-4 rounded-xl bg-[#111827] text-[#FFFFFF] text-sm">
                        Online booking is currently closed by{' '}
                        <strong className="font-semibold">
                          {cleanText(selectedDoctor.clinicName)}
                        </strong>
                        . Please check back when the doctor opens today&apos;s live token queue.
                      </div>
                    ) : !showBookingForm ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="type-body text-[#111827]/75">
                          Ready to reserve your live token for{' '}
                          <span className="font-medium text-[#111827] tabular-nums">
                            {formatHumanDate(clinicLocalDate)}
                          </span>
                          ?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingPatientName(cleanText(user?.fullName || ''));
                            setBookingPatientMobile(user?.mobileNumber || '');
                            setShowBookingForm(true);
                          }}
                          className="px-6 py-3 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Book Appointment Token
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleConfirmBooking}
                        className="border border-line-light rounded-xl p-6 space-y-4 bg-[#FFFFFF]"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-line-light">
                          <div>
                            <h3 className="type-subhead text-[#111827]">
                              Same-Day Appointment Token Booking
                            </h3>
                            <p className="text-xs text-[#111827]/65 mt-0.5 tabular-nums">
                              {formatHumanDate(clinicLocalDate)} · Instant sequential token assignment
                            </p>
                          </div>
                          <Ticket className="w-5 h-5 text-[#111827]" />
                        </div>

                        {bookingError && (
                          <div className="p-3 rounded-lg bg-[#111827] text-[#FFFFFF] text-sm">
                            {bookingError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1.5">
                              Patient Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={bookingPatientName}
                              onChange={(e) => setBookingPatientName(e.target.value)}
                              placeholder="Enter patient full name"
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
                              value={bookingPatientMobile}
                              onChange={(e) => setBookingPatientMobile(e.target.value)}
                              placeholder="0321-4567890"
                              className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowBookingForm(false)}
                            className="px-4 py-2.5 type-btn text-[#111827] border border-line-light rounded-lg hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={bookingSubmitting}
                            className="px-6 py-2.5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                          >
                            {bookingSubmitting ? 'Generating Token...' : 'Confirm Booking'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* 1C: DOCTOR DIRECTORY SEARCH & LISTINGS */
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="type-page-title text-[#111827]">
                      Doctor Directory
                    </h1>
                    <p className="type-body text-[#111827]/70 mt-1 tabular-nums">
                      Search PMDC-verified doctors and reserve your same-day clinic token for{' '}
                      <span className="font-medium text-[#111827]">
                        {formatHumanDate(clinicLocalDate)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadPortalData}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 type-btn text-[#111827] bg-[#FFFFFF] border border-line-light rounded-lg hover:bg-[#111827]/5 transition-colors duration-150 self-start cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#111827]" />
                    <span>Refresh Availability</span>
                  </button>
                </div>

                {/* 4 Search & Filter Controls */}
                <div className="card-surface p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#111827] mb-1.5">
                      Doctor Name
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#111827]/50 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchDoctorName}
                        onChange={(e) => setSearchDoctorName(e.target.value)}
                        placeholder="Search by doctor name..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111827] mb-1.5">
                      Clinic Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#111827]/50 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchClinicName}
                        onChange={(e) => setSearchClinicName(e.target.value)}
                        placeholder="Search by clinic name..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111827] mb-1.5">
                      Medical Specialty
                    </label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    >
                      <option value="All">All Specialties</option>
                      {specialties.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#111827] mb-1.5">
                      Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                    >
                      <option value="All">All Locations</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Doctor Directory Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-60 card-surface p-6 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="card-surface p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#111827]/5 text-[#111827] flex items-center justify-center mx-auto mb-3">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <h3 className="type-subhead text-[#111827] mb-1">
                      No Matching Verified Doctors Found
                    </h3>
                    <p className="text-sm text-[#111827]/65 mb-5 max-w-md mx-auto">
                      No doctors match your active search criteria. Reset your filters to browse all available specialists.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDoctorName('');
                        setSearchClinicName('');
                        setSelectedSpecialty('All');
                        setSelectedLocation('All');
                      }}
                      className="px-4 py-2 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDoctors.map((doc) => (
                      <div
                        key={doc.doctorId}
                        className="card-surface p-6 flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Row: 48px Circular Initials Avatar + Availability Pill */}
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

                          <h3 className="type-card-title text-[#111827] mb-0.5">
                            {cleanText(doc.doctorName)}
                          </h3>
                          <p className="text-xs font-medium text-[#111827]/75 mb-1.5">
                            {cleanText(doc.specialty)} · {cleanText(doc.qualification)}
                          </p>

                          {/* Verified Checkmark + PMDC Number */}
                          <div className="inline-flex items-center gap-1.5 text-xs text-[#111827]/70 mb-4 tabular-nums">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#245BFA] shrink-0" />
                            <span className="font-mono">{doc.pmdcNumber}</span>
                            <span>· Verified</span>
                          </div>

                          <div className="pt-3 border-t border-line-light space-y-1 text-sm text-[#111827]/75 mb-5">
                            <p className="font-semibold text-[#111827]">
                              {cleanText(doc.clinicName)}
                            </p>
                            <p className="text-xs text-[#111827]/65">
                              {cleanText(doc.clinicAddress)} · {cleanText(doc.location)}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-line-light flex items-center justify-between">
                          <div>
                            <span className="text-xs text-[#111827]/60 block">
                              Consultation Fee
                            </span>
                            <span className="font-[family-name:var(--font-display)] text-base font-semibold text-[#111827] tabular-nums">
                              PKR {doc.consultationFee.toLocaleString()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setShowBookingForm(false);
                              setBookingConfirmation(null);
                            }}
                            className="px-4 py-2 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MY APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="type-page-title text-[#111827]">My Appointments</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Track your live clinic token numbers, queue status, and consultation details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className="px-4 py-2.5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 self-start cursor-pointer"
              >
                Book New Appointment
              </button>
            </div>

            {/* Motivational Live Tracker Card when Patient has an Active Waiting / In Progress Appointment */}
            {activeWaitingAppointment && (
              <div className="card-surface-navy p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="px-4 py-2.5 rounded-full bg-[#245BFA] text-[#FFFFFF] font-mono text-xl font-bold tabular-nums shrink-0">
                    #{activeWaitingAppointment.tokenNumber}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-on-navy-muted">
                        Live Queue Tracker · {formatHumanDate(activeWaitingAppointment.appointmentDate)}
                      </span>
                    </div>
                    <h2 className="type-card-title text-[#FFFFFF]">
                      {cleanText(activeWaitingAppointment.doctorName)}
                    </h2>
                    <p className="text-xs text-on-navy-muted mt-0.5">
                      {cleanText(activeWaitingAppointment.specialty)} ·{' '}
                      {cleanText(activeWaitingAppointment.clinicName)} (
                      {cleanText(activeWaitingAppointment.location)})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:justify-end border-t md:border-t-0 border-[#FFFFFF]/15 pt-4 md:pt-0">
                  <div>
                    <span className="text-xs text-on-navy-muted block mb-1">
                      Current Queue Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#245BFA] text-[#FFFFFF]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
                      <span>{activeWaitingAppointment.status}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={loadPortalData}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 type-btn text-[#FFFFFF] bg-navy-2 border border-line-dark rounded-lg hover:bg-[#FFFFFF]/10 transition-colors duration-150 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Status</span>
                  </button>
                </div>
              </div>
            )}

            {myAppointments.length === 0 ? (
              <div className="card-surface p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#111827]/5 text-[#111827] flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="type-subhead text-[#111827] mb-1">
                  No Appointments Booked Yet
                </h3>
                <p className="text-sm text-[#111827]/65 mb-5 max-w-md mx-auto">
                  Browse the Doctor Directory to reserve your first same-day clinic consultation token.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="px-4 py-2.5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                >
                  Browse Available Doctors
                </button>
              </div>
            ) : (
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                        <th className="py-3.5 px-5">Token</th>
                        <th className="py-3.5 px-5">Date</th>
                        <th className="py-3.5 px-5">Doctor &amp; Specialty</th>
                        <th className="py-3.5 px-5">Clinic Location</th>
                        <th className="py-3.5 px-5">Patient</th>
                        <th className="py-3.5 px-5 text-right">Fee</th>
                        <th className="py-3.5 px-5 text-right">Queue Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-light text-sm">
                      {myAppointments.map((appt) => (
                        <tr
                          key={appt.id}
                          className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                        >
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#111827]/5 text-[#111827] font-mono text-xs font-semibold tabular-nums">
                              #{appt.tokenNumber}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-xs text-[#111827]/75 tabular-nums whitespace-nowrap">
                            {formatTableDate(appt.appointmentDate)}
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[15px] text-[#111827]">
                              {cleanText(appt.doctorName)}
                            </p>
                            <p className="text-xs text-[#111827]/65 mt-0.5">
                              {cleanText(appt.specialty)}
                            </p>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[14px] text-[#111827]">
                              {cleanText(appt.clinicName)}
                            </p>
                            <p className="text-xs text-[#111827]/65 mt-0.5">
                              {cleanText(appt.clinicAddress)} · {cleanText(appt.location)}
                            </p>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[14px] text-[#111827]">
                              {cleanText(appt.patientName)}
                            </p>
                            <p className="text-xs font-mono text-[#111827]/65 tabular-nums mt-0.5">
                              {appt.patientMobile}
                            </p>
                          </td>
                          <td className="py-4 px-5 text-right text-sm font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                            PKR {(appt.consultationFee || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {renderStatusBadge(appt.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
