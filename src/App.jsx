import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Homepage from './pages/Homepage';
import Login from './components/auth/Login';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import ClientDashboard from './components/client/ClientDashboard';
import Register from './pages/Register'; // ✅ Import from actual file
import ThemeToggle from './components/common/ThemeToggle';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <ThemeToggle />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Employee Routes */}
            <Route path="/employee/*" element={
              <ProtectedRoute allowedRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            } />

            {/* Client Routes */}
            <Route path="/client/*" element={
              <ProtectedRoute allowedRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/register" element={<Register />} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;