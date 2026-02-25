
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  Wallet, 
  History, 
  Trophy, 
  LogOut, 
  Menu, 
  X,
  User,
  Settings,
  Shield // Add this for admin icon
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/history', label: 'History', icon: History },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isActive = (path) => location.pathname === path;
  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xl">W</span>
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden md:block">
              Wealth
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isActive(item.path)
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}

            {/* Admin Panel Link - Desktop */}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isAdminActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-purple-600/20 text-purple-400 hover:text-white hover:bg-purple-600/40'
                }`}
              >
                <Shield size={18} />
                Admin Panel
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm text-gray-400">Welcome back,</p>
              <p className="text-white font-bold">
                {user?.username}
                {user?.role === 'admin' && (
                  <span className="ml-2 text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded-md">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl font-medium transition-all"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="mb-4 p-4 bg-slate-800/50 rounded-xl">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-white font-bold text-lg">
                {user?.username}
                {user?.role === 'admin' && (
                  <span className="ml-2 text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded-md">
                    Admin
                  </span>
                )}
              </p>
            </div>

            {/* Regular Nav Items - Mobile */}
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium mb-2 transition-all ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}

            {/* Admin Panel Link - Mobile */}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium mb-2 transition-all ${
                  isAdminActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 hover:text-white'
                }`}
              >
                <Shield size={20} />
                Admin Panel
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
