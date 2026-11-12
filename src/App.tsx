import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { PublicWebsite, PublicRoute } from './components/PublicWebsite.tsx';
import { AuthViews } from './components/AuthViews.tsx';
import { PatientPortal } from './components/PatientPortal.tsx';
import { DoctorPortal } from './components/DoctorPortal.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { DirectoryDoctor } from './types/clinicos.ts';

const ClinicOSRouter: React.FC = () => {
  const { user } = useAuth();
  const [publicRoute, setPublicRoute] = useState<PublicRoute>('home');
  const [directoryPreview, setDirectoryPreview] = useState<DirectoryDoctor[]>([]);
  const [clinicLocalDate, setClinicLocalDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    fetch('/api/public/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors) setDirectoryPreview(data.doctors);
        if (data.clinicLocalDate) setClinicLocalDate(data.clinicLocalDate);
      })
      .catch((err) => {
        console.error('Failed to load public directory preview:', err);
      });
  }, [user, publicRoute]);

  // Role-Based Portal Routing when Authenticated
  if (user) {
    if (user.role === 'patient') {
      return <PatientPortal />;
    }
    if (user.role === 'doctor') {
      return <DoctorPortal />;
    }
    if (user.role === 'admin') {
      return <AdminPanel />;
    }
  }

  // Public Website & Auth Views
  if (publicRoute !== 'home') {
    return (
      <AuthViews
        mode={publicRoute}
        onNavigate={(route) => setPublicRoute(route)}
        onAuthSuccess={() => setPublicRoute('home')}
      />
    );
  }

  return (
    <PublicWebsite
      onNavigate={(route) => setPublicRoute(route)}
      directoryPreview={directoryPreview}
      clinicLocalDate={clinicLocalDate}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ClinicOSRouter />
    </AuthProvider>
  );
}
