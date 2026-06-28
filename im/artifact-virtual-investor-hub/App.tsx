import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authContext';
import { PublicLayout } from './components/PublicLayout';
import { InvestorLayout } from './components/InvestorLayout';
import { Home } from './pages/public/Home';
import { Company } from './pages/public/Company';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/investor/Dashboard';
import { Analytics } from './pages/investor/Analytics';
import { Voting } from './pages/investor/Voting';
import { Portfolio } from './pages/investor/Portfolio';
import { Documents } from './pages/investor/Documents';
import { Roadmap } from './pages/investor/Roadmap';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: React.PropsWithChildren) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Company />} />
        <Route path="/about" element={<Home />} />
      </Route>

      {/* Auth Route */}
      <Route path="/login" element={<Login />} />

      {/* Investor Routes (Protected) */}
      <Route path="/investor" element={
        <ProtectedRoute>
          <InvestorLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="voting" element={<Voting />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="documents" element={<Documents />} />
        <Route path="roadmap" element={<Roadmap />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;