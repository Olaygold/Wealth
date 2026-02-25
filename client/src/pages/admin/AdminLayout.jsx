// src/pages/admin/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Target,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown
} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/admin/dashboard', 
      icon: LayoutDashboard 
    },
    { 
      name: 'Users', 
      path: '/admin/users', 
      icon: Users 
    },
    { 
      name: 'Withdrawals', 
      path: '/admin/withdrawals', 
      icon: ArrowUpCircle,
      badge: true // Show badge for pending items
    },
    { 
      name: 'Deposits', 
      path: '/admin/deposits', 
      icon: ArrowDownCircle,
      badge: true
    },
    { 
      name: 'Transactions', 
      path: '/admin/transactions', 
      icon: Receipt 
    },
    { 
      name: 'Rounds', 
      path: '/admin/rounds', 
      icon: Target 
    },
    { 
      name: 'Settings', 
      path: '/admin/settings', 
      icon: Settings 
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-gray-900 text-white transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-20'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          {sidebarOpen && (
            <span className="text-xl font-bold">Admin Panel</span>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 hidden lg:block"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors
                ${isActive(item.path) 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="ml-3">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      !
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`
        transition-all duration-300
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
      `}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Page Title */}
            <h1 className="text-lg font-semibold text-gray-900 hidden lg:block">
              {menuItems.find(item => isActive(item.path))?.name || 'Admin'}
            </h1>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100">
                <Bell className="h-6 w-6 text-gray-600" />
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {/* Admin Profile */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  Admin
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 hidden md:block" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
