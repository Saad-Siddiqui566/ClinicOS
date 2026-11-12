import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DoctorDocumentItem } from '../types/clinicos.ts';
import {
  cleanText,
  formatTableDate,
  getDoctorInitials,
} from '../utils/formatters.ts';

type AdminTab =
  | 'dashboard'
  | 'verification'
  | 'doctors'
  | 'patients'
  | 'settings';

interface AdminDoctorRecord {
  doctorId: number;
  profileId: number;
  fullName: string;
  email: string | null;
  mobileNumber: string;
  specialty: string;
  qualification: string;
  pmdcNumber: string;
  verificationStatus: 'Pending' | 'Approved' | 'Rejected';
  accountStatus: 'Active' | 'Inactive';
  consultationFee: number;
  verifiedAt?: string | null;
  verifiedBy?: number | null;
  createdAt: string;
  clinicId: number;
  clinicName: string;
  clinicAddress: string;
  location: string;
  onlineBookingOpen: boolean;
  documents: DoctorDocumentItem[];
}

interface AdminPatientRecord {
  patientId: number;
  profileId: number;
  fullName: string;
  mobileNumber: string;
  email: string | null;
  accountStatus: 'Active' | 'Inactive';
  createdAt: string;
}

interface AdminAuditAction {
  id: number;
  adminId: number;
  doctorId: number;
  action: string;
  decision: string;
  createdAt: string;
}

function renderVerificationPill(status: string) {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#245BFA]/10 text-[#245BFA]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#245BFA]" />
        <span>Approved</span>
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#111827]/10 text-[#111827]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
        <span>Pending Review</span>
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

function renderAccountStatusPill(status: 'Active' | 'Inactive') {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#245BFA]/10 text-[#245BFA]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#245BFA]" />
        <span>Active</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#111827]/5 text-[#111827]/60">
      <span className="w-1.5 h-1.5 rounded-full bg-[#111827]/40" />
      <span>Inactive</span>
    </span>
  );
}

export const AdminPanel: React.FC = () => {
  const { user, logout, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [metrics, setMetrics] = useState({
    totalDoctors: 0,
    approvedDoctors: 0,
    pendingDoctors: 0,
    rejectedDoctors: 0,
    totalPatients: 0,
  });
  const [doctors, setDoctors] = useState<AdminDoctorRecord[]>([]);
  const [patients, setPatients] = useState<AdminPatientRecord[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAuditAction[]>([]);
  const [, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [selectedDoctorModal, setSelectedDoctorModal] = useState<AdminDoctorRecord | null>(
    null
  );
  const [newPassword, setNewPassword] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        metrics: typeof metrics;
        doctors: AdminDoctorRecord[];
        patients: AdminPatientRecord[];
        adminActions: AdminAuditAction[];
      }>('/api/admin/overview');
      setMetrics(res.metrics);
      setDoctors(res.doctors || []);
      setPatients(res.patients || []);
      setAdminActions(res.adminActions || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleVerifyDoctor = async (
    doctorId: number,
    decision: 'Approved' | 'Rejected'
  ) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/doctors/${doctorId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setSelectedDoctorModal(null);
      await loadAdminData();
      setFeedback({
        type: 'success',
        text: `Doctor application #${doctorId} marked as ${decision}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleToggleDoctorStatus = async (
    doctorId: number,
    accountStatus: 'Active' | 'Inactive'
  ) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/doctors/${doctorId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus }),
      });
      await loadAdminData();
      setFeedback({
        type: 'success',
        text: `Doctor account status updated to ${accountStatus}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleTogglePatientStatus = async (
    patientId: number,
    accountStatus: 'Active' | 'Inactive'
  ) => {
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/patients/${patientId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus }),
      });
      await loadAdminData();
      setFeedback({
        type: 'success',
        text: `Patient account status updated to ${accountStatus}.`,
      });
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
      setFeedback({ type: 'success', text: 'Admin password updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] flex">
      {/* Sidebar — Midnight Navy (#111827) with Electric Royal Blue (#245BFA) Active States */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] text-[#FFFFFF] flex flex-col justify-between transition-transform lg:translate-x-0 lg:static ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="px-6 py-5 border-b border-[#FFFFFF]/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#245BFA] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </span>
              <div>
                <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[#FFFFFF] block">
                  ClinicOS Admin
                </span>
                <span className="type-meta text-on-navy-muted block">
                  Governance &amp; Verification
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
                setActiveTab('dashboard');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('verification');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg type-nav transition-colors duration-150 cursor-pointer ${
                activeTab === 'verification'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Doctor Verification</span>
              </div>
              {metrics.pendingDoctors > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFFFFF]/20 text-[#FFFFFF] text-xs font-mono tabular-nums">
                  {metrics.pendingDoctors}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('doctors');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 cursor-pointer ${
                activeTab === 'doctors'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Stethoscope className="w-4 h-4 shrink-0" />
              <span>Doctor Directory</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('patients');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 cursor-pointer ${
                activeTab === 'patients'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Patient Accounts</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg type-nav transition-colors duration-150 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#245BFA] text-[#FFFFFF] font-semibold'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Admin Settings</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#FFFFFF]/10">
          <div className="px-3 py-2 mb-2 text-xs text-on-navy-muted">
            <p className="font-semibold text-sm text-[#FFFFFF] truncate">
              {cleanText(user?.fullName)}
            </p>
            <p className="type-meta text-on-navy-muted mt-0.5">{user?.email}</p>
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

      {/* Main Content — Pure White (#FFFFFF) */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#FFFFFF] border-b border-line-light px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-[#111827] hover:bg-[#111827]/5 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-[#111827]/70">
              <strong className="font-semibold text-[#111827]">Protected Admin Panel</strong> ·{' '}
              <span>Administrator</span>
            </span>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#111827]" />
            <span>Refresh Records</span>
          </button>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-sm ${
                feedback.type === 'success'
                  ? 'bg-[#245BFA]/10 border-[#245BFA]/30 text-[#111827]'
                  : 'bg-[#111827] border-[#111827] text-[#FFFFFF]'
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="opacity-75 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* A. ADMIN OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">Governance Overview</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Live platform metrics and administrative verification activity
                </p>
              </div>

              {/* 5 Database Metrics — Layered Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="card-surface p-6">
                  <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                    Registered Doctors
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827] tabular-nums">
                    {metrics.totalDoctors}
                  </span>
                </div>

                <div className="card-surface p-6">
                  <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                    Approved Doctors
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827] tabular-nums">
                    {metrics.approvedDoctors}
                  </span>
                </div>

                <div className="card-surface p-6">
                  <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                    Pending Review
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827] tabular-nums">
                    {metrics.pendingDoctors}
                  </span>
                </div>

                <div className="card-surface p-6">
                  <span className="text-xs font-medium text-[#111827]/65 block mb-1.5">
                    Rejected Applications
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#111827]/60 tabular-nums">
                    {metrics.rejectedDoctors}
                  </span>
                </div>

                <div className="card-surface-navy p-6">
                  <span className="text-xs font-medium text-on-navy-muted block mb-1.5">
                    Registered Patients
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#FFFFFF] tabular-nums">
                    {metrics.totalPatients}
                  </span>
                </div>
              </div>

              {/* Recent Admin Actions Log */}
              <div className="card-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-line-light flex items-center justify-between">
                  <h2 className="type-card-title text-[#111827]">
                    Verification Audit Log
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className="text-xs font-semibold text-[#245BFA] hover:underline cursor-pointer"
                  >
                    Review Pending Doctors →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                        <th className="py-3.5 px-5">Action ID</th>
                        <th className="py-3.5 px-5">Reviewer</th>
                        <th className="py-3.5 px-5">Doctor ID</th>
                        <th className="py-3.5 px-5">Action</th>
                        <th className="py-3.5 px-5">Decision</th>
                        <th className="py-3.5 px-5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-light text-sm">
                      {adminActions.map((act) => (
                        <tr key={act.id} className="hover:bg-[#111827]/[0.02]">
                          <td className="py-3.5 px-5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#111827]/5 font-mono text-xs font-semibold text-[#111827] tabular-nums">
                              #{act.id}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 type-meta tabular-nums">
                            Admin #{act.adminId}
                          </td>
                          <td className="py-3.5 px-5 type-meta tabular-nums">
                            Doctor #{act.doctorId}
                          </td>
                          <td className="py-3.5 px-5 font-medium text-[#111827]">
                            {act.action}
                          </td>
                          <td className="py-3.5 px-5">
                            {renderVerificationPill(act.decision)}
                          </td>
                          <td className="py-3.5 px-5 text-right text-xs text-[#111827]/65 tabular-nums">
                            {new Date(act.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* B. DOCTOR VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">Doctor Verification</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Review doctor applications, inspect private PMDC documents, and approve or reject credentials
                </p>
              </div>

              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                        <th className="py-3.5 px-5">Doctor &amp; Credentials</th>
                        <th className="py-3.5 px-5">Clinic Details</th>
                        <th className="py-3.5 px-5">Registration Date</th>
                        <th className="py-3.5 px-5">Verification Status</th>
                        <th className="py-3.5 px-5 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-light text-sm">
                      {doctors.map((doc) => (
                        <tr
                          key={doc.doctorId}
                          className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#111827] text-[#FFFFFF] font-display text-xs font-semibold flex items-center justify-center shrink-0">
                                {getDoctorInitials(doc.fullName)}
                              </div>
                              <div>
                                <p className="font-semibold text-[15px] text-[#111827]">
                                  {cleanText(doc.fullName)}
                                </p>
                                <p className="text-xs text-[#111827]/65 mt-0.5 tabular-nums">
                                  {cleanText(doc.specialty)} · <span className="font-mono">{doc.pmdcNumber}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[14px] text-[#111827]">
                              {cleanText(doc.clinicName)}
                            </p>
                            <p className="text-xs text-[#111827]/65 mt-0.5">
                              {cleanText(doc.location)}
                            </p>
                          </td>
                          <td className="py-4 px-5 text-xs text-[#111827]/75 tabular-nums whitespace-nowrap">
                            {formatTableDate(doc.createdAt.slice(0, 10))}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            {renderVerificationPill(doc.verificationStatus)}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDoctorModal(doc)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 whitespace-nowrap cursor-pointer"
                              >
                                View Docs ({doc.documents.length})
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerifyDoctor(doc.doctorId, 'Approved')
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 whitespace-nowrap cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerifyDoctor(doc.doctorId, 'Rejected')
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#111827] hover:opacity-90 transition-opacity duration-150 whitespace-nowrap cursor-pointer"
                              >
                                Reject
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

          {/* C. DOCTOR MANAGEMENT */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">Doctor Directory Management</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Inspect doctor profiles and manage clinic account status
                </p>
              </div>

              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                        <th className="py-3.5 px-5">Doctor &amp; Specialty</th>
                        <th className="py-3.5 px-5">Clinic Location</th>
                        <th className="py-3.5 px-5">Verification</th>
                        <th className="py-3.5 px-5">Account Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-light text-sm">
                      {doctors.map((doc) => (
                        <tr
                          key={doc.doctorId}
                          className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                        >
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[15px] text-[#111827]">
                              {cleanText(doc.fullName)}
                            </p>
                            <p className="text-xs text-[#111827]/65 mt-0.5">
                              {cleanText(doc.specialty)} · <span className="font-mono tabular-nums">{doc.pmdcNumber}</span>
                            </p>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[14px] text-[#111827]">
                              {cleanText(doc.clinicName)}
                            </p>
                            <p className="text-xs text-[#111827]/65 mt-0.5">
                              {cleanText(doc.location)}
                            </p>
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            {renderVerificationPill(doc.verificationStatus)}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            {renderAccountStatusPill(doc.accountStatus)}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDoctorModal(doc)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
                              >
                                View Details
                              </button>
                              {doc.accountStatus === 'Active' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleDoctorStatus(doc.doctorId, 'Inactive')
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#111827] hover:opacity-90 transition-opacity duration-150 cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleDoctorStatus(doc.doctorId, 'Active')
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}
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

          {/* D. PATIENT MANAGEMENT */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">Patient Accounts</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  View and manage registered patient accounts across ClinicOS
                </p>
              </div>

              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line-light bg-[#111827] text-[#FFFFFF] text-xs font-medium">
                        <th className="py-3.5 px-5">Patient Details</th>
                        <th className="py-3.5 px-5">Email</th>
                        <th className="py-3.5 px-5">Registration Date</th>
                        <th className="py-3.5 px-5">Account Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-light text-sm">
                      {patients.map((pat) => (
                        <tr
                          key={pat.patientId}
                          className="hover:bg-[#111827]/[0.02] transition-colors duration-150"
                        >
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[15px] text-[#111827]">
                              {cleanText(pat.fullName)}
                            </p>
                            <p className="text-xs font-mono text-[#111827]/65 tabular-nums mt-0.5">
                              {pat.mobileNumber}
                            </p>
                          </td>
                          <td className="py-4 px-5 text-sm text-[#111827]/75">
                            {pat.email || '—'}
                          </td>
                          <td className="py-4 px-5 text-xs text-[#111827]/75 tabular-nums whitespace-nowrap">
                            {formatTableDate(pat.createdAt.slice(0, 10))}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            {renderAccountStatusPill(pat.accountStatus)}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {pat.accountStatus === 'Active' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleTogglePatientStatus(pat.patientId, 'Inactive')
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#111827] hover:opacity-90 transition-opacity duration-150 cursor-pointer"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleTogglePatientStatus(pat.patientId, 'Active')
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* E. ADMIN SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h1 className="type-page-title text-[#111827]">Admin Settings</h1>
                <p className="type-body text-[#111827]/70 mt-1">
                  Manage administrator profile credentials and security
                </p>
              </div>

              <div className="card-surface p-6 space-y-3 text-sm">
                <h2 className="type-card-title text-[#111827] pb-2 border-b border-line-light">
                  Admin Profile
                </h2>
                <div className="flex justify-between">
                  <span className="text-[#111827]/65">Full Name</span>
                  <span className="font-semibold text-[#111827]">
                    {cleanText(user?.fullName)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#111827]/65">Email</span>
                  <span className="type-meta text-[#111827]">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#111827]/65">Mobile Number</span>
                  <span className="type-meta text-[#111827] tabular-nums">
                    {user?.mobileNumber}
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleChangePassword}
                className="card-surface p-6 space-y-4"
              >
                <h2 className="type-card-title text-[#111827]">Change Password</h2>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1.5">
                    New Administrator Password *
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
                  className="px-5 py-2.5 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Application & Private Verification Document Inspection Modal */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-surface max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-line-light mb-4">
              <div>
                <p className="type-meta text-[#111827]/65 mb-0.5">
                  Doctor Application &amp; Private Document Vault
                </p>
                <h3 className="type-card-title text-[#111827]">
                  {cleanText(selectedDoctorModal.fullName)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctorModal(null)}
                className="p-1 text-[#111827]/65 hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border border-line-light rounded-xl p-4 mb-6">
              <div>
                <span className="text-xs text-[#111827]/65 block mb-0.5">
                  PMDC Registration Number
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#111827] tabular-nums">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#245BFA]" />
                  <span>{selectedDoctorModal.pmdcNumber}</span>
                </span>
              </div>
              <div>
                <span className="text-xs text-[#111827]/65 block mb-0.5">
                  Specialty &amp; Qualification
                </span>
                <span className="font-semibold text-[#111827]">
                  {cleanText(selectedDoctorModal.specialty)} ·{' '}
                  {cleanText(selectedDoctorModal.qualification)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#111827]/65 block mb-0.5">
                  Clinic Name &amp; Location
                </span>
                <span className="font-semibold text-[#111827]">
                  {cleanText(selectedDoctorModal.clinicName)} (
                  {cleanText(selectedDoctorModal.location)})
                </span>
              </div>
              <div>
                <span className="text-xs text-[#111827]/65 block mb-0.5">
                  Clinic Address
                </span>
                <span className="text-[#111827]">
                  {cleanText(selectedDoctorModal.clinicAddress)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#111827]/65 block mb-0.5">Contact</span>
                <span className="type-meta text-[#111827] tabular-nums">
                  {selectedDoctorModal.email} · {selectedDoctorModal.mobileNumber}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#111827]/65 block mb-1">
                  Verification Status
                </span>
                {renderVerificationPill(selectedDoctorModal.verificationStatus)}
              </div>
            </div>

            <h4 className="type-subhead text-[#111827] mb-3">
              Private Verification Documents ({selectedDoctorModal.documents.length})
            </h4>
            <div className="space-y-3 mb-6">
              {selectedDoctorModal.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-line-light rounded-xl p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#111827] shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">
                          {doc.documentType}
                        </p>
                        <p className="type-meta text-[#111827]/65 tabular-nums">
                          {doc.fileName} · {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#245BFA]/10 text-[#245BFA] text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Private Vault</span>
                    </span>
                  </div>
                  {doc.fileData && doc.mimeType.startsWith('image/') && (
                    <img
                      src={doc.fileData}
                      alt={doc.documentType}
                      referrerPolicy="no-referrer"
                      className="mt-2 max-h-48 object-contain rounded-lg border border-line-light"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-line-light flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedDoctorModal(null)}
                className="px-4 py-2 rounded-lg type-btn text-[#111827] border border-line-light hover:bg-[#111827]/5 transition-colors duration-150 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleVerifyDoctor(selectedDoctorModal.doctorId, 'Rejected')
                  }
                  className="px-4 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#111827] hover:opacity-90 transition-opacity duration-150 cursor-pointer"
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleVerifyDoctor(selectedDoctorModal.doctorId, 'Approved')
                  }
                  className="px-4 py-2 rounded-lg type-btn text-[#FFFFFF] bg-[#245BFA] hover:bg-sage-hover transition-colors duration-150 cursor-pointer"
                >
                  Approve Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
