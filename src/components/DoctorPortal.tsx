import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Edit3,
  LogOut,
  Menu,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Ticket,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AppointmentRecord,
  AppointmentStatus,
  ClinicData,
  DoctorProfileData,
  EXPENSE_CATEGORIES,
  ExpenseRecord,
  MEDICAL_SPECIALTIES,
  PAYMENT_METHODS,
  PaymentRecord,
} from '../types/clinicos.ts';
import {
  cleanText,
  formatHumanDate,
  formatTableDate,
} from '../utils/formatters.ts';

type DoctorSection = 'appointments' | 'expenses' | 'financials' | 'settings';

function renderQueueStatusBadge(status: AppointmentStatus | string) {
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

function renderPaymentPill(payment?: PaymentRecord | null) {
  if (!payment) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#111827]/5 text-[#111827]/60">
        <span className="w-1.5 h-1.5 rounded-full bg-[#111827]/35" />
        <span>Not Recorded</span>
      </span>
    );
  }
  if (payment.paymentStatus === 'Paid') {
    return (
      <div className="inline-flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#245BFA]/10 text-[#245BFA] tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-[#245BFA]" />
          <span>Paid · PKR {payment.amount.toLocaleString()}</span>
        </span>
        <span className="text-[11px] text-[#111827]/55 pl-2">
          via {payment.paymentMethod}
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#111827]/10 text-[#111827] tabular-nums">
        <span className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
        <span>
          {payment.paymentStatus} · PKR {payment.amount.toLocaleString()}
        </span>
      </span>
      <span className="text-[11px] text-[#111827]/55 pl-2">
        via {payment.paymentMethod}
      </span>
    </div>
  );
}

export const DoctorPortal: React.FC = () => {
  const { user, logout, apiFetch, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState<DoctorSection>('appointments');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const expenseNameInputRef = useRef<HTMLInputElement | null>(null);

  // Operational state
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [clinic, setClinic] = useState<ClinicData | null>(user?.clinic || null);
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(user?.doctor || null);
  const [clinicLocalDate, setClinicLocalDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Appointment Management state
  const [apptTab, setApptTab] = useState<'online' | 'walk-in'>('online');
  const [apptSearch, setApptSearch] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [walkInName, setWalkInName] = useState('');
  const [walkInMobile, setWalkInMobile] = useState('');
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [lastGeneratedWalkIn, setLastGeneratedWalkIn] = useState<AppointmentRecord | null>(null);

  // Payment Recording Modal state
  const [paymentModalAppt, setPaymentModalAppt] = useState<AppointmentRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Pending' | 'Refunded'>('Paid');
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Expense Management state
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterMode, setExpenseFilterMode] = useState<
    'daily' | 'monthly' | 'yearly' | 'custom'
  >('monthly');
  const [expenseCustomStart, setExpenseCustomStart] = useState('');
  const [expenseCustomEnd, setExpenseCustomEnd] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expName, setExpName] = useState('');
  const [expCategory, setExpCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expSubmitting, setExpSubmitting] = useState(false);

  // Financial Dashboard state
  const [finFilterMode, setFinFilterMode] = useState<'day' | 'month' | 'year' | 'custom'>(
    'month'
  );
  const [finCustomStart, setFinCustomStart] = useState('');
  const [finCustomEnd, setFinCustomEnd] = useState('');
  const [finData, setFinData] = useState<{
    startDate: string;
    endDate: string;
    summary: { totalRevenue: number; totalExpenses: number; netProfit: number };
    payments: PaymentRecord[];
    expenses: ExpenseRecord[];
  } | null>(null);

  // Settings state
  const [setFullName, setSetFullName] = useState(cleanText(user?.fullName || ''));
  const [setMobile, setSetMobile] = useState(user?.mobileNumber || '');
  const [setSpecialty, setSetSpecialty] = useState(user?.doctor?.specialty || '');
  const [setQualification, setSetQualification] = useState(user?.doctor?.qualification || '');
  const [setFee, setSetFee] = useState(String(user?.doctor?.consultationFee || 2500));
  const [setClinicName, setSetClinicName] = useState(cleanText(user?.clinic?.clinicName || ''));
  const [setClinicAddress, setSetClinicAddress] = useState(
    cleanText(user?.clinic?.clinicAddress || '')
  );
  const [setLocation, setSetLocation] = useState(cleanText(user?.clinic?.location || ''));
  const [setOnlineOpen, setSetOnlineOpen] = useState(
    user?.clinic?.onlineBookingOpen ?? true
  );
  const [newPassword, setNewPassword] = useState('');

  const isApprovedAndActive =
    user?.doctor?.verificationStatus === 'Approved' &&
    user?.doctor?.accountStatus === 'Active';

  const computeDateRange = useCallback(
    (
      mode: 'day' | 'month' | 'year' | 'custom' | 'daily' | 'monthly' | 'yearly',
      cStart: string,
      cEnd: string
    ) => {
      const base = clinicLocalDate || new Date().toISOString().slice(0, 10);
      const [yyyy, mm] = base.split('-');
      if (mode === 'day' || mode === 'daily') {
        return { start: base, end: base };
      }
      if (mode === 'month' || mode === 'monthly') {
        return { start: `${yyyy}-${mm}-01`, end: `${yyyy}-${mm}-31` };
      }
      if (mode === 'year' || mode === 'yearly') {
        return { start: `${yyyy}-01-01`, end: `${yyyy}-12-31` };
      }
      return {
        start: cStart || `${yyyy}-${mm}-01`,
        end: cEnd || base,
      };
    },
    [clinicLocalDate]
  );

  const loadDoctorOperationalData = useCallback(async () => {
    if (!isApprovedAndActive) return;
    setLoading(true);
    try {
      const [apptRes, expRes] = await Promise.all([
        apiFetch<{
          appointments: AppointmentRecord[];
          clinic: ClinicData;
          doctor: DoctorProfileData;
          clinicLocalDate: string;
        }>('/api/doctor/appointments'),
        apiFetch<{ expenses: ExpenseRecord[] }>('/api/doctor/expenses'),
      ]);

      setAppointments(apptRes.appointments || []);
      setClinic(apptRes.clinic);
      setDoctor(apptRes.doctor);
      const localDay = apptRes.clinicLocalDate || new Date().toISOString().slice(0, 10);
      setClinicLocalDate(localDay);
      setExpDate((prev) => prev || localDay);
      setExpenseCustomStart((prev) => prev || `${localDay.slice(0, 7)}-01`);
      setExpenseCustomEnd((prev) => prev || localDay);
      setFinCustomStart((prev) => prev || `${localDay.slice(0, 7)}-01`);
      setFinCustomEnd((prev) => prev || localDay);
      setExpenses(expRes.expenses || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isApprovedAndActive]);

  const loadFinancials = useCallback(async () => {
    if (!isApprovedAndActive) return;
    try {
      const range = computeDateRange(finFilterMode, finCustomStart, finCustomEnd);
      const res = await apiFetch<{
        startDate: string;
        endDate: string;
        summary: { totalRevenue: number; totalExpenses: number; netProfit: number };
        payments: PaymentRecord[];
        expenses: ExpenseRecord[];
      }>(
        `/api/doctor/financials?startDate=${encodeURIComponent(range.start)}&endDate=${encodeURIComponent(range.end)}`
      );
      setFinData(res);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  }, [apiFetch, computeDateRange, finCustomEnd, finCustomStart, finFilterMode, isApprovedAndActive]);

  useEffect(() => {
    loadDoctorOperationalData();
  }, [loadDoctorOperationalData]);

  useEffect(() => {
    loadFinancials();
  }, [loadFinancials]);

  // If Doctor is Pending or Rejected, show Verification Status View
  if (!isApprovedAndActive) {
    const status = user?.doctor?.verificationStatus || 'Pending';
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex flex-col">
        <header className="bg-[#111827] text-[#FFFFFF] border-b border-[#FFFFFF]/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[#FFFFFF]">
              ClinicOS
            </span>
            <span className="type-meta text-on-navy-muted">Doctor Portal</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full card-surface p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="type-meta text-[#111827]/65 mb-0.5">Credential Review</p>
                <h1 className="type-card-title text-[#111827]">
                  Application Status: {status}
                </h1>
              </div>
            </div>

            <p className="type-body text-[#111827]/75 mb-6">
              {status === 'Pending'
                ? 'Your doctor account and PMDC registration credentials have been received and are currently awaiting review by a ClinicOS medical administrator. Operational dashboard access and public directory listing will unlock automatically upon approval.'
                : 'Your doctor verification application was not approved by the ClinicOS administration team. Please contact support@clinicos.pk if you wish to submit updated PMDC documentation.'}
            </p>

            <div className="border-t border-b border-line-light py-4 space-y-2.5 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-[#111827]/65">Doctor Name</span>
                <span className="font-semibold text-[#111827]">{cleanText(user?.fullName)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111827]/65">PMDC Registration</span>
                <span className="type-meta text-[#111827] tabular-nums">
                  {user?.doctor?.pmdcNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111827]/65">Specialty</span>
                <span className="font-semibold text-[#111827]">{user?.doctor?.specialty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111827]/65">Clinic Name</span>
                <span className="font-semibold text-[#111827]">
                  {cleanText(user?.clinic?.clinicName)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111827]/65">Verification Documents</span>
                <span className="type-meta text-[#111827] tabular-nums">
                  {user?.documents?.length || 0} file(s) in private vault
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={refreshUser}
                className="inline-flex items-center gap-2 px-4 py-2.5 type-btn text-[#FFFFFF] bg-[#245BFA] rounded-lg hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Approval Status</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 type-btn text-[#111827] border border-line-light rounded-lg hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Handlers for Approved Doctor
  const handleToggleOnlineBooking = async (open: boolean) => {
    setFeedback(null);
    try {
      const res = await apiFetch<{ clinic: ClinicData }>('/api/doctor/clinic/online-booking', {
        method: 'PATCH',
        body: JSON.stringify({ onlineBookingOpen: open }),
      });
      setClinic(res.clinic);
      setSetOnlineOpen(res.clinic.onlineBookingOpen);
      setFeedback({
        type: 'success',
        text: `Online booking is now ${res.clinic.onlineBookingOpen ? 'Open' : 'Closed'} for today.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleStatusChange = async (appointmentId: number, status: AppointmentStatus) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/doctor/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadDoctorOperationalData();
      setFeedback({ type: 'success', text: `Appointment status updated to ${status}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleGenerateWalkInToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!walkInName.trim() || !walkInMobile.trim()) {
      setFeedback({ type: 'error', text: 'Enter Patient Name and Mobile Number.' });
      return;
    }
    setWalkInSubmitting(true);
    try {
      const res = await apiFetch<{ appointment: AppointmentRecord }>(
        '/api/doctor/appointments/walk-in',
        {
          method: 'POST',
          body: JSON.stringify({
            patientName: walkInName.trim(),
            patientMobile: walkInMobile.trim(),
          }),
        }
      );
      setLastGeneratedWalkIn(res.appointment);
      setWalkInName('');
      setWalkInMobile('');
      await loadDoctorOperationalData();
      setFeedback({
        type: 'success',
        text: `Generated Daily Token #${res.appointment.tokenNumber} for walk-in patient ${cleanText(res.appointment.patientName)}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setWalkInSubmitting(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalAppt) return;
    setPaySubmitting(true);
    setFeedback(null);
    try {
      await apiFetch('/api/doctor/payments', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: paymentModalAppt.id,
          amount: Number(payAmount),
          paymentDate: payDate || clinicLocalDate,
          paymentStatus: payStatus,
          paymentMethod: payMethod,
        }),
      });
      setPaymentModalAppt(null);
      await loadDoctorOperationalData();
      await loadFinancials();
      setFeedback({
        type: 'success',
        text: 'Consultation payment recorded and synced to Financial Dashboard.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setExpSubmitting(true);
    try {
      if (editingExpenseId) {
        await apiFetch(`/api/doctor/expenses/${editingExpenseId}`, {
          method: 'PUT',
          body: JSON.stringify({
            expenseName: expName,
            category: expCategory,
            amount: Number(expAmount),
            expenseDate: expDate,
            notes: expNotes,
          }),
        });
        setFeedback({ type: 'success', text: 'Expense record updated.' });
      } else {
        await apiFetch('/api/doctor/expenses', {
          method: 'POST',
          body: JSON.stringify({
            expenseName: expName,
            category: expCategory,
            amount: Number(expAmount),
            expenseDate: expDate,
            notes: expNotes,
          }),
        });
        setFeedback({ type: 'success', text: 'New clinic expense recorded.' });
      }
      setEditingExpenseId(null);
      setExpName('');
      setExpAmount('');
      setExpNotes('');
      await loadDoctorOperationalData();
      await loadFinancials();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/doctor/expenses/${id}`, { method: 'DELETE' });
      await loadDoctorOperationalData();
      await loadFinancials();
      setFeedback({ type: 'success', text: 'Expense deleted.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await apiFetch<{ doctor: DoctorProfileData; clinic: ClinicData }>(
        '/api/doctor/settings',
        {
          method: 'PUT',
          body: JSON.stringify({
            fullName: setFullName,
            mobileNumber: setMobile,
            specialty: setSpecialty,
            qualification: setQualification,
            consultationFee: Number(setFee),
            clinicName: setClinicName,
            clinicAddress: setClinicAddress,
            location: setLocation,
            onlineBookingOpen: setOnlineOpen,
          }),
        }
      );
      setDoctor(res.doctor);
      setClinic(res.clinic);
      await refreshUser();
      setFeedback({ type: 'success', text: 'Doctor & Clinic settings saved successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      setNewPassword('');
      setFeedback({ type: 'success', text: 'Account password updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  // Filtered Online Appointments & Daily Queue
  const filteredOnlineAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.appointmentType === 'online')
      .filter((a) => {
        const matchSearch =
          cleanText(a.patientName).toLowerCase().includes(apptSearch.toLowerCase()) ||
          a.patientMobile.toLowerCase().includes(apptSearch.toLowerCase()) ||
          String(a.tokenNumber).includes(apptSearch);
        const matchStatus =
          apptStatusFilter === 'All' || a.status === apptStatusFilter;
        return matchSearch && matchStatus;
      });
  }, [appointments, apptSearch, apptStatusFilter]);

  const unifiedDailyQueue = useMemo(() => {
    return appointments
      .filter((a) => a.appointmentDate === clinicLocalDate)
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  }, [appointments, clinicLocalDate]);

  // 4 KPI Summary Metrics for Today's Queue
  const todayKpis = useMemo(() => {
    const totalToday = unifiedDailyQueue.length;
    const waitingCount = unifiedDailyQueue.filter(
      (a) => a.status === 'Waiting' || a.status === 'In Progress'
    ).length;
    const completedCount = unifiedDailyQueue.filter(
      (a) => a.status === 'Completed'
    ).length;
    const todayRevenue = unifiedDailyQueue.reduce((sum, a) => {
      if (a.payment && a.payment.paymentStatus === 'Paid') {
        return sum + a.payment.amount;
      }
      return sum;
    }, 0);
    return {
      totalToday,
      waitingCount,
      completedCount,
      todayRevenue,
    };
  }, [unifiedDailyQueue]);

  // Filtered Expenses for Expense Management
  const filteredExpenses = useMemo(() => {
    const range = computeDateRange(
      expenseFilterMode,
      expenseCustomStart,
      expenseCustomEnd
    );
    return expenses.filter((e) => {
      const inDate = e.expenseDate >= range.start && e.expenseDate <= range.end;
      const matchSearch =
        cleanText(e.expenseName).toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        cleanText(e.notes || '').toLowerCase().includes(expenseSearch.toLowerCase());
      return inDate && matchSearch;
    });
  }, [
    computeDateRange,
    expenseCustomEnd,
    expenseCustomStart,
    expenseFilterMode,
    expenseSearch,
    expenses,
  ]);

  // Financial Chart grouping by Date
  const financialDailySeries = useMemo(() => {
    if (!finData) return [];
    const dateSet = new Set<string>();
    finData.payments.forEach((p) => dateSet.add(p.paymentDate));
    finData.expenses.forEach((e) => dateSet.add(e.expenseDate));
    const sortedDates = Array.from(dateSet).sort();

    return sortedDates.map((d) => {
      const rev = finData.payments
        .filter((p) => p.paymentDate === d)
        .reduce((s, p) => s + p.amount, 0);
      const exp = finData.expenses
        .filter((e) => e.expenseDate === d)
        .reduce((s, e) => s + e.amount, 0);
      return {
        date: d,
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
      };
    });
  }, [finData]);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex">
      {/* Sidebar Navigation — Midnight Navy (#111827) with Electric Royal Blue (#245BFA) Active States */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] text-[#FFFFFF] flex flex-col justify-between transition-transform lg:translate-x-0 lg:static no-print ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="px-6 py-5 border-b border-[#FFFFFF]/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </span>
              <div className="min-w-0">
                <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[#FFFFFF] block">
                  ClinicOS
                </span>
                <span className="type-meta text-on-navy-muted block truncate max-w-[160px]">
                  {cleanText(clinic?.clinicName || 'Doctor Portal')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-[#FFFFFF]/70 hover:text-[#FFFFFF]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveSection('appointments');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                activeSection === 'appointments'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Ticket className="w-4 h-4 shrink-0" />
              <span>Queue Operations</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('expenses');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                activeSection === 'expenses'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Expense Management</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('financials');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                activeSection === 'financials'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Financial Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('settings');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                activeSection === 'settings'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Clinic Settings</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#FFFFFF]/10">
          <div className="px-3 py-2 mb-2 text-xs text-on-navy-muted">
            <p className="font-semibold text-sm text-[#FFFFFF] truncate">
              {cleanText(user?.fullName)}
            </p>
            <p className="type-meta text-on-navy-muted mt-0.5 tabular-nums">
              {doctor?.pmdcNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg type-nav text-[#FFFFFF]/80 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#FFFFFF]/80" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area — Pure White (#FFFFFF) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top contextual header */}
        <header className="bg-[#FFFFFF] border-b border-line-light px-6 py-4 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-[#111827] hover:bg-[#111827]/5 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-[#111827]/70 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-[#111827]">
                {cleanText(clinic?.clinicName)}
              </span>
              <span aria-hidden="true">/</span>
              <span>
                {activeSection === 'appointments' && 'Queue Operations'}
                {activeSection === 'expenses' && 'Expense Management'}
                {activeSection === 'financials' && 'Financial Dashboard'}
                {activeSection === 'settings' && 'Clinic Settings'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-xs font-medium text-[#111827]/70 tabular-nums">
                {formatHumanDate(clinicLocalDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleOnlineBooking(!clinic?.onlineBookingOpen)}
              className={`px-3.5 py-2 rounded-lg type-btn transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                clinic?.onlineBookingOpen
                  ? 'bg-[#245BFA] text-[#FFFFFF] hover:bg-sage-hover'
                  : 'bg-[#111827] text-[#FFFFFF] hover:opacity-90'
              }`}
            >
              {clinic?.onlineBookingOpen
                ? 'Online Booking: Open'
                : 'Online Booking: Closed'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-sm no-print ${
                feedback.type === 'success'
                  ? 'bg-[#245BFA]/10 border-[#245BFA]/30 text-[#111827]'
                  : 'bg-[#111827] border-[#111827] text-[#FFFFFF]'
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="ml-4 opacity-75 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =====================================================================
              1. QUEUE OPERATIONS (With 4-Card KPI Summary Strip + Online & Walk-In Tabs)
             ===================================================================== */}
          {activeSection === 'appointments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                  <h1 className="type-page-title text-[#111827]">
                    Queue Operations
                  </h1>
                  <p className="type-body text-[#111827]/70 mt-1 tabular-nums">
                    Live, real-time token queue for {cleanText(clinic?.clinicName)} ·{' '}
                    <span className="font-medium text-[#111827]">
                      {formatHumanDate(clinicLocalDate)}
                    </span>
                  </p>
                </div>

                {/* Clean Segmented Tab Controls */}
                <div className="inline-flex items-center p-1 bg-[#111827]/5 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setApptTab('online')}
                    className={`px-4 py-2 rounded-md type-btn transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                      apptTab === 'online'
                        ? 'bg-[#245BFA] text-[#FFFFFF]'
                        : 'text-[#111827]/75 hover:text-[#111827]'
                    }`}
                  >
                    Online Appointments
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptTab('walk-in')}
                    className={`px-4 py-2 rounded-md type-btn transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                      apptTab === 'walk-in'
                        ? 'bg-[#245BFA] text-[#FFFFFF]'
                        : 'text-[#111827]/75 hover:text-[#111827]'
                    }`}
                  >
                    Walk-In Appointments
                  </button>
                </div>
              </div>

              {/* Doctor Portal KPI Summary Strip (4 Cards with Icons) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                <div className="card-surface p-6 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                      Total Patients Today
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827] tabular-nums">
                      {todayKpis.totalToday}
                    </span>
                    <span className="text-xs text-[#111827]/55 block mt-1">
                      Online &amp; walk-in tokens
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#111827]/5 text-[#111827] flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="card-surface p-6 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                      Currently Waiting
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827] tabular-nums">
                      {todayKpis.waitingCount}
                    </span>
                    <span className="text-xs text-[#111827]/55 block mt-1">
                      Active in queue
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#245BFA]/10 text-[#245BFA] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="card-surface p-6 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                      Completed
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827] tabular-nums">
                      {todayKpis.completedCount}
                    </span>
                    <span className="text-xs text-[#111827]/55 block mt-1">
                      Consultations finished
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#111827]/5 text-[#111827] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="card-surface-navy p-6 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-on-navy-muted block mb-1.5">
                      Today&apos;s Collected Revenue
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#FFFFFF] tabular-nums">
                      PKR {todayKpis.todayRevenue.toLocaleString()}
                    </span>
                    <span className="text-xs text-on-navy-muted block mt-1">
                      Verified paid visits
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-navy-2 text-[#FFFFFF] flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* ONLINE APPOINTMENTS TAB */}
              {apptTab === 'online' && (
                <div className="space-y-4">
                  {/* Controls bar */}
                  <div className="card-surface p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-[#111827]/50 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={apptSearch}
                          onChange={(e) => setApptSearch(e.target.value)}
                          placeholder="Search patient name, mobile, or token #..."
                          className="w-full pl-9 pr-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                        />
                      </div>

                      <select
                        value={apptStatusFilter}
                        onChange={(e) =>
                          setApptStatusFilter(e.target.value as 'All' | AppointmentStatus)
                        }
                        className="px-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Waiting">Waiting</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleOnlineBooking(true)}
                        disabled={clinic?.onlineBookingOpen}
                        className="px-3.5 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover disabled:opacity-40 transition-colors duration-150 whitespace-nowrap cursor-pointer"
                      >
                        Open Online Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleOnlineBooking(false)}
                        disabled={!clinic?.onlineBookingOpen}
                        className="px-3.5 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 disabled:opacity-40 transition-colors duration-150 whitespace-nowrap cursor-pointer"
                      >
                        Close Online Booking
                      </button>
                    </div>
                  </div>

                  {/* Online Appointments Table */}
                  {filteredOnlineAppointments.length === 0 ? (
                    <div className="card-surface p-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#111827]/5 text-[#111827] flex items-center justify-center mx-auto mb-3">
                        <Ticket className="w-6 h-6" />
                      </div>
                      <h3 className="type-subhead text-[#111827] mb-1">
                        No Online Appointments Found
                      </h3>
                      <p className="text-sm text-[#111827]/65 mb-5 max-w-md mx-auto">
                        {apptSearch || apptStatusFilter !== 'All'
                          ? 'No appointments match your current search or status filter.'
                          : 'When patients reserve same-day tokens online, they will appear here automatically.'}
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        {(apptSearch || apptStatusFilter !== 'All') && (
                          <button
                            type="button"
                            onClick={() => {
                              setApptSearch('');
                              setApptStatusFilter('All');
                            }}
                            className="px-4 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setApptTab('walk-in')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Register Walk-In Patient</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="card-surface overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                              <th className="py-3.5 px-5">Token</th>
                              <th className="py-3.5 px-5">Patient Details</th>
                              <th className="py-3.5 px-5">Appointment Date</th>
                              <th className="py-3.5 px-5">Booking Status</th>
                              <th className="py-3.5 px-5">Consultation Payment</th>
                              <th className="py-3.5 px-5 text-right">Update Status &amp; Fee</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line-light text-sm">
                            {filteredOnlineAppointments.map((appt) => (
                              <tr
                                key={appt.id}
                                className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                              >
                                <td className="py-4 px-5">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#111827]/5 text-[#111827] font-mono text-xs font-semibold tabular-nums">
                                    #{appt.tokenNumber}
                                  </span>
                                </td>
                                <td className="py-4 px-5">
                                  <p className="font-semibold text-[15px] text-[#111827]">
                                    {cleanText(appt.patientName)}
                                  </p>
                                  <p className="text-xs font-mono text-[#111827]/65 tabular-nums mt-0.5">
                                    {appt.patientMobile} · Online Booking
                                  </p>
                                </td>
                                <td className="py-4 px-5 text-xs text-[#111827]/75 tabular-nums whitespace-nowrap">
                                  {formatTableDate(appt.appointmentDate)}
                                </td>
                                <td className="py-4 px-5 whitespace-nowrap">
                                  {renderQueueStatusBadge(appt.status)}
                                </td>
                                <td className="py-4 px-5 whitespace-nowrap">
                                  {renderPaymentPill(appt.payment)}
                                </td>
                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-2">
                                    <select
                                      value={appt.status}
                                      onChange={(e) =>
                                        handleStatusChange(
                                          appt.id,
                                          e.target.value as AppointmentStatus
                                        )
                                      }
                                      className="px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                                    >
                                      <option value="Waiting">Waiting</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentModalAppt(appt);
                                        setPayAmount(
                                          String(
                                            appt.payment?.amount ??
                                              doctor?.consultationFee ??
                                              2500
                                          )
                                        );
                                        setPayDate(
                                          appt.payment?.paymentDate || appt.appointmentDate
                                        );
                                        setPayStatus(
                                          appt.payment?.paymentStatus || 'Paid'
                                        );
                                        setPayMethod(
                                          appt.payment?.paymentMethod || 'Cash'
                                        );
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap cursor-pointer"
                                    >
                                      {appt.payment ? 'Edit Payment' : 'Record Fee'}
                                    </button>
                                  </div>
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

              {/* WALK-IN APPOINTMENTS TAB */}
              {apptTab === 'walk-in' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Walk-In Registration Form */}
                    <div className="lg:col-span-5 card-surface p-6 no-print">
                      <h2 className="type-card-title text-[#111827] mb-1">
                        Register Walk-In Patient
                      </h2>
                      <p className="text-sm text-[#111827]/70 mb-5 tabular-nums">
                        Generates the next live daily token in the same sequence as online bookings ({formatHumanDate(clinicLocalDate)}).
                      </p>

                      <form onSubmit={handleGenerateWalkInToken} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#111827] mb-1.5">
                            Patient Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={walkInName}
                            onChange={(e) => setWalkInName(e.target.value)}
                            placeholder="e.g., Muhammad Akram"
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
                            value={walkInMobile}
                            onChange={(e) => setWalkInMobile(e.target.value)}
                            placeholder="e.g., 0301-7654321"
                            className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={walkInSubmitting}
                            className="flex-1 py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap cursor-pointer"
                          >
                            {walkInSubmitting ? 'Generating...' : 'Generate Token'}
                          </button>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 whitespace-nowrap cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-[#111827]" />
                            <span>Print Slip</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Printable Token Slip Preview */}
                    <div className="lg:col-span-7 card-surface p-6">
                      <div className="flex items-center justify-between pb-4 border-b border-line-light mb-4">
                        <div>
                          <p className="type-meta text-[#111827]/65 mb-0.5">
                            Daily Queue Token Slip
                          </p>
                          <h3 className="type-card-title text-[#111827]">
                            {cleanText(clinic?.clinicName)}
                          </h3>
                          <p className="text-xs text-[#111827]/65 mt-0.5">
                            {cleanText(clinic?.clinicAddress)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#111827]/65 block mb-1">
                            Token Number
                          </span>
                          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#245BFA]/10 text-[#245BFA] text-2xl font-mono font-bold tabular-nums">
                            #
                            {lastGeneratedWalkIn?.tokenNumber ||
                              unifiedDailyQueue[unifiedDailyQueue.length - 1]?.tokenNumber ||
                              1}
                          </span>
                        </div>
                      </div>

                      {lastGeneratedWalkIn || unifiedDailyQueue.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-[#111827]/65 block mb-0.5">Patient Name</span>
                            <span className="font-semibold text-sm text-[#111827]">
                              {cleanText(
                                (
                                  lastGeneratedWalkIn ||
                                  unifiedDailyQueue[unifiedDailyQueue.length - 1]
                                )?.patientName
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#111827]/65 block mb-0.5">Mobile</span>
                            <span className="type-meta text-[#111827] tabular-nums">
                              {(
                                lastGeneratedWalkIn ||
                                unifiedDailyQueue[unifiedDailyQueue.length - 1]
                              )?.patientMobile}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#111827]/65 block mb-0.5">Booking Type</span>
                            <span className="type-meta text-[#111827] capitalize">
                              {(
                                lastGeneratedWalkIn ||
                                unifiedDailyQueue[unifiedDailyQueue.length - 1]
                              )?.appointmentType}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#111827]/65 block mb-0.5">Clinic Date</span>
                            <span className="text-xs font-medium text-[#111827] tabular-nums">
                              {formatTableDate(clinicLocalDate)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#111827]/65">
                          Generate a walk-in token to preview and print the patient slip.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unified Daily Queue Table (Online + Walk-In Combined) */}
                  <div className="card-surface overflow-hidden no-print">
                    <div className="px-6 py-4 border-b border-line-light flex items-center justify-between">
                      <div>
                        <h3 className="type-subhead text-[#111827]">
                          Today&apos;s Live Queue · {formatHumanDate(clinicLocalDate)}
                        </h3>
                        <p className="text-xs text-[#111827]/65 mt-0.5">
                          Online and walk-in patients ordered sequentially by daily token number
                        </p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#111827]/5 text-xs font-semibold text-[#111827] tabular-nums">
                        {unifiedDailyQueue.length} in queue
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                            <th className="py-3.5 px-5">Token</th>
                            <th className="py-3.5 px-5">Patient Details</th>
                            <th className="py-3.5 px-5">Booking Type</th>
                            <th className="py-3.5 px-5">Status</th>
                            <th className="py-3.5 px-5">Fee Payment</th>
                            <th className="py-3.5 px-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line-light text-sm">
                          {unifiedDailyQueue.map((appt) => (
                            <tr
                              key={appt.id}
                              className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                            >
                              <td className="py-4 px-5">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#111827]/5 text-[#111827] font-mono text-xs font-semibold tabular-nums">
                                  #{appt.tokenNumber}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <p className="font-semibold text-[15px] text-[#111827]">
                                  {cleanText(appt.patientName)}
                                </p>
                                <p className="text-xs font-mono text-[#111827]/65 tabular-nums mt-0.5">
                                  {appt.patientMobile}
                                </p>
                              </td>
                              <td className="py-4 px-5 text-xs text-[#111827]/75 capitalize">
                                {appt.appointmentType}
                              </td>
                              <td className="py-4 px-5 whitespace-nowrap">
                                {renderQueueStatusBadge(appt.status)}
                              </td>
                              <td className="py-4 px-5 whitespace-nowrap">
                                {renderPaymentPill(appt.payment)}
                              </td>
                              <td className="py-4 px-5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <select
                                    value={appt.status}
                                    onChange={(e) =>
                                      handleStatusChange(
                                        appt.id,
                                        e.target.value as AppointmentStatus
                                      )
                                    }
                                    className="px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                                  >
                                    <option value="Waiting">Waiting</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentModalAppt(appt);
                                      setPayAmount(
                                        String(
                                          appt.payment?.amount ??
                                            doctor?.consultationFee ??
                                            2500
                                        )
                                      );
                                      setPayDate(
                                        appt.payment?.paymentDate || appt.appointmentDate
                                      );
                                      setPayStatus(appt.payment?.paymentStatus || 'Paid');
                                      setPayMethod(appt.payment?.paymentMethod || 'Cash');
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                                  >
                                    {appt.payment ? 'Edit Fee' : 'Record Fee'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLastGeneratedWalkIn(appt);
                                      setTimeout(() => window.print(), 100);
                                    }}
                                    className="p-1.5 rounded-lg text-[#111827] hover:bg-[#111827]/10 transition-colors duration-150 cursor-pointer"
                                    title="Print Token"
                                  >
                                    <Printer className="w-4 h-4 text-[#111827]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              2. EXPENSE MANAGEMENT
             ===================================================================== */}
          {activeSection === 'expenses' && (
            <div className="space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">Expense Management</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Record and track daily clinic expenditures across 10 standardized categories
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Add / Edit Expense Form */}
                <div className="lg:col-span-4 card-surface p-6">
                  <h2 className="type-card-title text-[#111827] mb-4">
                    {editingExpenseId ? 'Edit Expense Record' : 'Record Clinic Expense'}
                  </h2>

                  <form onSubmit={handleSaveExpense} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-1.5">
                        Expense Name / Description *
                      </label>
                      <input
                        ref={expenseNameInputRef}
                        type="text"
                        required
                        value={expName}
                        onChange={(e) => setExpName(e.target.value)}
                        placeholder="e.g., Monthly Electricity Bill"
                        className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-1.5">
                        Category *
                      </label>
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">
                          Amount (PKR) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          placeholder="3500"
                          className="w-full px-3.5 py-2 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">
                          Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={expDate}
                          onChange={(e) => setExpDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-1.5">
                        Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={expNotes}
                        onChange={(e) => setExpNotes(e.target.value)}
                        placeholder="Invoice reference or supplier details..."
                        className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {editingExpenseId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpenseId(null);
                            setExpName('');
                            setExpAmount('');
                            setExpNotes('');
                          }}
                          className="px-4 py-2.5 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={expSubmitting}
                        className="flex-1 py-2.5 px-4 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                      >
                        {expSubmitting
                          ? 'Saving...'
                          : editingExpenseId
                          ? 'Update Expense'
                          : 'Add Expense'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Expense Filters & History Table */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="card-surface p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Segmented Date Filters */}
                      <div className="inline-flex items-center p-1 bg-[#111827]/5 rounded-lg self-start">
                        {(['daily', 'monthly', 'yearly', 'custom'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setExpenseFilterMode(mode)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors duration-150 cursor-pointer ${
                              expenseFilterMode === mode
                                ? 'bg-[#245BFA] text-[#FFFFFF]'
                                : 'text-[#111827]/75 hover:text-[#111827]'
                            }`}
                          >
                            {mode === 'custom' ? 'Custom Range' : mode}
                          </button>
                        ))}
                      </div>

                      {/* Search Expenses */}
                      <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 text-[#111827]/50 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={expenseSearch}
                          onChange={(e) => setExpenseSearch(e.target.value)}
                          placeholder="Search expenses..."
                          className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA] transition-colors duration-150"
                        />
                      </div>
                    </div>

                    {expenseFilterMode === 'custom' && (
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-line-light text-xs">
                        <span className="font-semibold text-[#111827]">From:</span>
                        <input
                          type="date"
                          value={expenseCustomStart}
                          onChange={(e) => setExpenseCustomStart(e.target.value)}
                          className="px-2.5 py-1.5 bg-[#FFFFFF] border border-line-light rounded-lg tabular-nums"
                        />
                        <span className="font-semibold text-[#111827]">To:</span>
                        <input
                          type="date"
                          value={expenseCustomEnd}
                          onChange={(e) => setExpenseCustomEnd(e.target.value)}
                          className="px-2.5 py-1.5 bg-[#FFFFFF] border border-line-light rounded-lg tabular-nums"
                        />
                      </div>
                    )}
                  </div>

                  {/* Expense History Table or Actionable Empty State */}
                  {filteredExpenses.length === 0 ? (
                    <div className="card-surface p-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#111827]/5 text-[#111827] flex items-center justify-center mx-auto mb-3">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h3 className="type-subhead text-[#111827] mb-1">
                        No Expenses Recorded for This Period
                      </h3>
                      <p className="text-sm text-[#111827]/65 mb-5 max-w-md mx-auto">
                        Log rent, utilities, generator fuel, staff salaries, or medical supplies to calculate accurate net clinic profit.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (expenseFilterMode === 'daily') {
                            setExpenseFilterMode('monthly');
                          }
                          expenseNameInputRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record First Expense</span>
                      </button>
                    </div>
                  ) : (
                    <div className="card-surface overflow-hidden">
                      <div className="px-6 py-4 border-b border-line-light flex items-center justify-between">
                        <h3 className="type-subhead text-[#111827]">
                          Expense History ({filteredExpenses.length} records)
                        </h3>
                        <span className="text-sm font-semibold text-[#111827] tabular-nums">
                          Total: PKR{' '}
                          {filteredExpenses
                            .reduce((s, e) => s + e.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                              <th className="py-3.5 px-5">Expense Details</th>
                              <th className="py-3.5 px-5">Category</th>
                              <th className="py-3.5 px-5">Date</th>
                              <th className="py-3.5 px-5 text-right">Amount</th>
                              <th className="py-3.5 px-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line-light text-sm">
                            {filteredExpenses.map((exp) => (
                              <tr
                                key={exp.id}
                                className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                              >
                                <td className="py-4 px-5">
                                  <p className="font-semibold text-[15px] text-[#111827]">
                                    {cleanText(exp.expenseName)}
                                  </p>
                                  {exp.notes && (
                                    <p className="text-xs text-[#111827]/65 mt-0.5">
                                      {cleanText(exp.notes)}
                                    </p>
                                  )}
                                </td>
                                <td className="py-4 px-5">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#111827]/5 text-xs font-medium text-[#111827]">
                                    {exp.category}
                                  </span>
                                </td>
                                <td className="py-4 px-5 text-xs text-[#111827]/75 tabular-nums whitespace-nowrap">
                                  {formatTableDate(exp.expenseDate)}
                                </td>
                                <td className="py-4 px-5 text-right font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                                  PKR {exp.amount.toLocaleString()}
                                </td>
                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingExpenseId(exp.id);
                                        setExpName(cleanText(exp.expenseName));
                                        setExpCategory(exp.category);
                                        setExpAmount(String(exp.amount));
                                        setExpDate(exp.expenseDate);
                                        setExpNotes(cleanText(exp.notes || ''));
                                        expenseNameInputRef.current?.focus();
                                      }}
                                      className="p-1.5 rounded-lg text-[#245BFA] hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                                      title="Edit Expense"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="p-1.5 rounded-lg text-[#111827]/70 hover:text-[#111827] hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                                      title="Delete Expense"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              3. FINANCIAL DASHBOARD
             ===================================================================== */}
          {activeSection === 'financials' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                  <h1 className="type-page-title text-[#111827]">
                    Financial Dashboard
                  </h1>
                  <p className="type-body text-[#111827]/70 mt-1">
                    Calculated from verified consultation payments and recorded clinic expenses
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Filters: Day, Month, Year, Custom Range */}
                  <div className="inline-flex items-center p-1 bg-[#111827]/5 rounded-lg">
                    {(
                      [
                        { id: 'day', label: 'Daily' },
                        { id: 'month', label: 'Monthly' },
                        { id: 'year', label: 'Yearly' },
                        { id: 'custom', label: 'Custom Range' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFinFilterMode(tab.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                          finFilterMode === tab.id
                            ? 'bg-[#245BFA] text-[#FFFFFF]'
                            : 'text-[#111827]/75 hover:text-[#111827]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {finFilterMode === 'custom' && (
                <div className="card-surface p-4 flex flex-wrap items-center gap-4 text-xs no-print">
                  <span className="font-semibold text-[#111827]">
                    Custom Date Range:
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Start Date</span>
                    <input
                      type="date"
                      value={finCustomStart}
                      onChange={(e) => setFinCustomStart(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#FFFFFF] border border-line-light rounded-lg tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>End Date</span>
                    <input
                      type="date"
                      value={finCustomEnd}
                      onChange={(e) => setFinCustomEnd(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#FFFFFF] border border-line-light rounded-lg tabular-nums"
                    />
                  </div>
                </div>
              )}

              {/* Financial Summary Grid: Total Revenue, Total Expenses, Net Profit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-surface p-6">
                  <span className="text-xs font-medium text-[#111827]/65 block mb-2">
                    Total Revenue (Consultation Payments)
                  </span>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#111827] tabular-nums">
                    PKR {(finData?.summary.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#111827]/65 mt-2 tabular-nums">
                    {finData?.payments.length || 0} verified paid consultations ·{' '}
                    {formatTableDate(finData?.startDate)} to {formatTableDate(finData?.endDate)}
                  </p>
                </div>

                <div className="card-surface p-6">
                  <span className="text-xs font-medium text-[#111827]/65 block mb-2">
                    Total Expenses (Operational Records)
                  </span>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#111827] tabular-nums">
                    PKR {(finData?.summary.totalExpenses || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#111827]/65 mt-2 tabular-nums">
                    {finData?.expenses.length || 0} expense entries in selected period
                  </p>
                </div>

                <div className="card-surface-navy p-6">
                  <span className="text-xs font-medium text-on-navy-muted block mb-2">
                    Net Profit (Total Revenue − Total Expenses)
                  </span>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#FFFFFF] tabular-nums">
                    PKR {(finData?.summary.netProfit || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-on-navy-muted mt-2">
                    Clinic: {cleanText(clinic?.clinicName)}
                  </p>
                </div>
              </div>

              {/* Financial Analytics Charts: Revenue Trends, Expense Trends, Profit Trends */}
              <div className="card-surface p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line-light mb-6">
                  <div>
                    <h2 className="type-card-title text-[#111827]">
                      Revenue, Expense &amp; Net Profit Breakdown
                    </h2>
                    <p className="text-xs text-[#111827]/65 mt-0.5 tabular-nums">
                      Period: {formatTableDate(finData?.startDate)} —{' '}
                      {formatTableDate(finData?.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#245BFA] font-semibold">
                      ■ Revenue
                    </span>
                    <span className="text-[#111827] font-semibold">
                      ■ Expenses
                    </span>
                  </div>
                </div>

                {financialDailySeries.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#111827]/5 text-[#111827] flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <h3 className="type-subhead text-[#111827] mb-1">
                      No Financial Activity in This Date Range
                    </h3>
                    <p className="text-sm text-[#111827]/65 mb-5 max-w-md mx-auto">
                      Record consultation payments in Queue Operations or log clinic expenses to populate your financial trend chart.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSection('appointments')}
                        className="px-4 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                      >
                        Record Consultation Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('expenses')}
                        className="px-4 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                      >
                        Record Expense
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-line-light">
                    {financialDailySeries.map((row) => {
                      const maxVal = Math.max(
                        ...financialDailySeries.map((r) =>
                          Math.max(r.revenue, r.expenses, Math.abs(r.profit), 1)
                        )
                      );
                      const revWidth = Math.round((row.revenue / maxVal) * 100);
                      const expWidth = Math.round((row.expenses / maxVal) * 100);
                      return (
                        <div key={row.date} className="py-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-[#111827] tabular-nums">
                              {formatTableDate(row.date)}
                            </span>
                            <div className="flex items-center gap-4 tabular-nums">
                              <span className="text-[#111827] font-semibold">
                                Revenue: PKR {row.revenue.toLocaleString()}
                              </span>
                              <span className="text-[#111827]/75">
                                Expenses: PKR {row.expenses.toLocaleString()}
                              </span>
                              <span className="font-semibold text-[#111827]">
                                Net Profit: PKR {row.profit.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="w-full bg-[#111827]/10 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#245BFA] h-full rounded-full"
                                style={{ width: `${Math.max(revWidth, 2)}%` }}
                              />
                            </div>
                            <div className="w-full bg-[#111827]/10 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#111827] h-full rounded-full"
                                style={{ width: `${Math.max(expWidth, 2)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detailed Ledger Tables for Print & Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-surface overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-line-light bg-[#111827] text-[#FFFFFF] flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Consultation Payments ({finData?.payments.length || 0})
                    </h3>
                    <span className="text-xs font-semibold text-[#FFFFFF] tabular-nums">
                      PKR {(finData?.summary.totalRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-line-light text-[#111827]/65">
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Token &amp; Patient</th>
                          <th className="py-2.5 px-4">Method</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-light">
                        {(finData?.payments || []).map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                              {formatTableDate(p.paymentDate)}
                            </td>
                            <td className="py-3 px-4 font-medium text-[#111827]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#111827]/5 font-mono text-[11px] font-semibold text-[#111827] tabular-nums mr-1.5">
                                #{p.tokenNumber}
                              </span>
                              {cleanText(p.patientName)}
                            </td>
                            <td className="py-3 px-4 text-[#111827]/75">{p.paymentMethod}</td>
                            <td className="py-3 px-4 text-right font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                              PKR {p.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card-surface overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-line-light bg-[#111827] text-[#FFFFFF] flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Clinic Expenses ({finData?.expenses.length || 0})
                    </h3>
                    <span className="text-xs font-semibold text-[#FFFFFF] tabular-nums">
                      PKR {(finData?.summary.totalExpenses || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-line-light text-[#111827]/65">
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Expense</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-light">
                        {(finData?.expenses || []).map((e) => (
                          <tr key={e.id}>
                            <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                              {formatTableDate(e.expenseDate)}
                            </td>
                            <td className="py-3 px-4 font-medium text-[#111827]">
                              {cleanText(e.expenseName)}
                            </td>
                            <td className="py-3 px-4 text-[#111827]/75">{e.category}</td>
                            <td className="py-3 px-4 text-right font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                              PKR {e.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              4. CLINIC SETTINGS
             ===================================================================== */}
          {activeSection === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">
                  Clinic Settings
                </h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Manage your doctor profile, clinic location, consultation fee, online booking switch, and password
                </p>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="card-surface p-6 space-y-6"
              >
                <h2 className="type-card-title text-[#111827] pb-3 border-b border-line-light">
                  Doctor Profile &amp; Clinic Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Doctor Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={setFullName}
                      onChange={(e) => setSetFullName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={setMobile}
                      onChange={(e) => setSetMobile(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Medical Specialty *
                    </label>
                    <select
                      value={setSpecialty}
                      onChange={(e) => setSetSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
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
                      value={setQualification}
                      onChange={(e) => setSetQualification(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">
                      Clinic Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={setClinicName}
                      onChange={(e) => setSetClinicName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
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
                        value={setLocation}
                        onChange={(e) => setSetLocation(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
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
                        value={setFee}
                        onChange={(e) => setSetFee(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
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
                      value={setClinicAddress}
                      onChange={(e) => setSetClinicAddress(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-line-light flex items-center justify-between">
                  <div>
                    <p className="type-subhead text-[#111827]">
                      Same-Day Online Booking Availability
                    </p>
                    <p className="text-xs text-[#111827]/65 mt-0.5">
                      Control whether patients can book online tokens for today
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={setOnlineOpen}
                    onChange={(e) => setSetOnlineOpen(e.target.checked)}
                    className="w-5 h-5 accent-[#245BFA] cursor-pointer"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                  >
                    Save Profile &amp; Clinic Settings
                  </button>
                </div>
              </form>

              {/* Change Password */}
              <form
                onSubmit={handleChangePassword}
                className="card-surface p-6 space-y-4"
              >
                <h2 className="type-card-title text-[#111827]">Change Password</h2>
                <div className="max-w-sm">
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg type-btn text-[#FFFFFF] bg-[#111827] hover:opacity-90 transition-opacity duration-150 cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Record Consultation Payment Modal */}
      {paymentModalAppt && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="card-surface max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line-light mb-4">
              <div>
                <h3 className="type-card-title text-[#111827]">
                  Record Consultation Payment
                </h3>
                <p className="text-xs text-[#111827]/65 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#111827]/5 font-mono text-xs font-semibold text-[#111827] tabular-nums mr-1.5">
                    #{paymentModalAppt.tokenNumber}
                  </span>
                  {cleanText(paymentModalAppt.patientName)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalAppt(null)}
                className="text-[#111827]/60 hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">
                  Payment Amount (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm tabular-nums bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={payStatus}
                    onChange={(e) =>
                      setPayStatus(e.target.value as 'Paid' | 'Pending' | 'Refunded')
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] border border-line-light rounded-lg focus:outline-none focus:border-[#245BFA]"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-light">
                <button
                  type="button"
                  onClick={() => setPaymentModalAppt(null)}
                  className="px-4 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-5 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                >
                  {paySubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
