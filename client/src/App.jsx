
// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// User Components
import Navbar from './components/Layout/Navbar';

// User Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Referrals from './pages/Referrals'; // ✅ NEW

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import UserDetails from './pages/admin/UserDetails';
import Withdrawals from './pages/admin/Withdrawals';
import Deposits from './pages/admin/Deposits';
import Transactions from './pages/admin/Transactions';
import Rounds from './pages/admin/Rounds';
import RoundDetails from './pages/admin/RoundDetails';
import Settings from './pages/admin/Settings';
import Influencers from './pages/admin/Influencers'; // ✅ NEW

// Protected Route (for regular users)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-darker">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return user ? (
    <>
      <Navbar />
      {children}
    </>
  ) : (
    <Navigate to="/login" />
  );
};

// Admin Route (for admin only)
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-darker">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-darker">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Redirect admin to admin panel, regular users to dashboard
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            {/* ===== PUBLIC ROUTES ===== */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ===== ADMIN ROUTES ===== */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:userId" element={<UserDetails />} />
              <Route path="withdrawals" element={<Withdrawals />} />
              <Route path="deposits" element={<Deposits />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="rounds" element={<Rounds />} />
              <Route path="rounds/:roundId" element={<RoundDetails />} />
              <Route path="influencers" element={<Influencers />} /> {/* ✅ NEW */}
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* ===== PROTECTED USER ROUTES ===== */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/wallet" 
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/history" 
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/leaderboard" 
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              } 
            />

            {/* ✅ NEW: Referrals Route */}
            <Route 
              path="/referrals" 
              element={
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              } 
            />

            {/* Catch all - redirect to appropriate dashboard */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>

        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155'
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
