import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LogIn, TrendingUp, Wallet, Shield } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.emailOrUsername, formData.password);
      toast.success('Welcome back! 🎉');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-darker via-dark to-slate-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary p-12 flex-col justify-between">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4">Wealth</h1>
          <p className="text-xl text-white/90">Predict. Win. Earn.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <TrendingUp className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-xl font-semibold text-white">Real-time Trading</h3>
              <p className="text-white/80">Predict BTC price movements every 5 minutes</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Wallet className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-xl font-semibold text-white">Instant Payouts</h3>
              <p className="text-white/80">Win up to 2× your stake instantly</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Shield className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-xl font-semibold text-white">100% Transparent</h3>
              <p className="text-white/80">Provably fair, real prices from Binance</p>
            </div>
          </div>
        </div>

        <p className="text-white/60 text-sm">
          © 2024 Wealth. All rights reserved.
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Wealth
            </h1>
            <p className="text-gray-400 mt-2">Predict. Win. Earn.</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-slate-700">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 mb-8">Login to start trading</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email or Username
                </label>
                <input
                  type="text"
                  name="emailOrUsername"
                  value={formData.emailOrUsername}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="Enter email or username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="Enter password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:text-primary/80 font-semibold">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
