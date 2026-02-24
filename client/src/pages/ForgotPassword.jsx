import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  Mail, 
  ArrowLeft, 
  Send,
  CheckCircle,
  AlertCircle,
  KeyRound
} from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      
      if (response.success) {
        setSent(true);
        toast.success('Reset link sent! Check your email.');
      } else {
        setError(response.message || 'Failed to send reset link');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      // Don't reveal if email exists or not for security
      setSent(true); // Still show success to prevent email enumeration
      toast.success('If an account exists with this email, you will receive a reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-darker via-dark to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft size={20} />
          Back to Login
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-slate-700">
          {!sent ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Forgot Password?</h2>
                <p className="text-gray-400">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-4 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
                <p className="text-gray-400 mb-6">
                  We've sent a password reset link to<br />
                  <span className="text-white font-medium">{email}</span>
                </p>
                
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-400">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button 
                      onClick={() => setSent(false)}
                      className="text-primary hover:underline"
                    >
                      try another email
                    </button>
                  </p>
                </div>

                <Link 
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition"
                >
                  <ArrowLeft size={20} />
                  Back to Login
                </Link>
              </div>
            </>
          )}

          {/* Help */}
          {!sent && (
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
