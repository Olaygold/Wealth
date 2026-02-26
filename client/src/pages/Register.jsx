
// src/pages/Register.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  UserPlus, 
  TrendingUp, 
  Wallet, 
  Shield, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import axios from 'axios';

// ========== INPUT FIELD COMPONENT (OUTSIDE TO PREVENT RE-RENDERS) ==========
const InputField = ({ 
  label, 
  name, 
  type = 'text', 
  placeholder, 
  required = false,
  value,
  onChange,
  onBlur,
  error
}) => {
  const hasError = error;
  const hasValue = value?.length > 0;
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition pr-12 ${
            hasError 
              ? 'border-red-500 focus:ring-red-500' 
              : hasValue && !hasError
              ? 'border-green-500 focus:ring-green-500'
              : 'border-slate-600 focus:ring-primary focus:border-transparent'
          }`}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {hasError && <XCircle size={18} className="text-red-500" />}
          {hasValue && !hasError && <CheckCircle size={18} className="text-green-500" />}
        </div>
      </div>
      
      {hasError && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle size={14} />
          {hasError}
        </p>
      )}
    </div>
  );
};

// ========== MAIN REGISTER COMPONENT ==========
const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRefCode = searchParams.get('ref') || '';
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    referralCode: initialRefCode,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [referralValidation, setReferralValidation] = useState({
    isValidating: false,
    isValid: false,
    referrerName: '',
    message: ''
  });
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const referralTimerRef = useRef(null);
  const hasValidatedInitialRef = useRef(false);

  // ========== VALIDATE REFERRAL CODE ==========
  const validateReferralCode = async (code, isInitialLoad = false) => {
    // Clear if empty
    if (!code || code.trim().length === 0) {
      setReferralValidation({
        isValidating: false,
        isValid: false,
        referrerName: '',
        message: ''
      });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    
    // Don't validate if too short
    if (cleanCode.length < 3) {
      setReferralValidation({
        isValidating: false,
        isValid: false,
        referrerName: '',
        message: ''
      });
      return;
    }

    setReferralValidation(prev => ({ 
      ...prev, 
      isValidating: true,
      message: 'Validating...'
    }));

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      console.log(`🔍 Validating referral code: ${cleanCode}`); // Debug log
      
      const response = await axios.get(`${API_URL}/auth/validate-referral/${cleanCode}`, {
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ Validation response:', response.data); // Debug log
      
      if (response.data.success && response.data.valid) {
        setReferralValidation({
          isValidating: false,
          isValid: true,
          referrerName: response.data.data.referrerUsername,
          message: `✓ Referred by: ${response.data.data.referrerUsername}`
        });
        
        if (isInitialLoad) {
          toast.success(`Welcome! You were referred by ${response.data.data.referrerUsername}`);
        }
      } else {
        setReferralValidation({
          isValidating: false,
          isValid: false,
          referrerName: '',
          message: response.data.message || 'Invalid referral code'
        });
      }
    } catch (error) {
      console.error('❌ Referral validation error:', error); // Debug log
      
      let errorMessage = 'Invalid referral code';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || 'Referral code not found';
        console.log('Server error:', error.response.status, error.response.data);
      } else if (error.request) {
        // No response received
        errorMessage = 'Could not validate code. Please try again.';
        console.log('No response received');
      } else {
        // Request setup error
        errorMessage = 'Validation failed. Please try again.';
        console.log('Request error:', error.message);
      }
      
      setReferralValidation({
        isValidating: false,
        isValid: false,
        referrerName: '',
        message: errorMessage
      });
    }
  };

  // ========== VALIDATE REFERRAL CODE ON LOAD (with delay) ==========
  useEffect(() => {
    if (initialRefCode && !hasValidatedInitialRef.current) {
      hasValidatedInitialRef.current = true;
      
      // Add small delay to ensure API is ready
      const timer = setTimeout(() => {
        validateReferralCode(initialRefCode, true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [initialRefCode]);

  // ========== VALIDATION FUNCTIONS ==========
  const validateFullName = (name) => {
    if (!name || name.trim().length < 3) {
      return 'Full name must be at least 3 characters';
    }
    if (name.trim().length > 100) {
      return 'Full name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Full name can only contain letters and spaces';
    }
    return null;
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) {
      return 'Phone number is required';
    }
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    if (!cleanPhone.startsWith('0')) {
      return 'Phone number must start with 0';
    }
    if (cleanPhone.length !== 11) {
      return 'Phone number must be exactly 11 digits';
    }
    if (!/^\d+$/.test(cleanPhone)) {
      return 'Phone number can only contain digits';
    }
    return null;
  };

  const validateUsername = (username) => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers and underscore';
    }
    return null;
  };

  const validateEmail = (email) => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return null;
  };

  const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  // ========== HANDLE INPUT CHANGE ==========
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }

    // Validate referral code with debounce
    if (name === 'referralCode') {
      if (referralTimerRef.current) {
        clearTimeout(referralTimerRef.current);
      }
      
      // Clear validation if empty
      if (!value || value.trim().length === 0) {
        setReferralValidation({
          isValidating: false,
          isValid: false,
          referrerName: '',
          message: ''
        });
        return;
      }
      
      referralTimerRef.current = setTimeout(() => {
        validateReferralCode(value, false);
      }, 800); // Wait 800ms after user stops typing
    }
  };

  // ========== VALIDATE ON BLUR ==========
  const handleBlur = (e) => {
    const { name, value } = e.target;
    let error = null;

    switch (name) {
      case 'fullName':
        error = validateFullName(value);
        break;
      case 'phoneNumber':
        error = validatePhoneNumber(value);
        break;
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
      case 'referralCode':
        // Validate immediately on blur if there's a value
        if (value && value.trim().length >= 3) {
          if (referralTimerRef.current) {
            clearTimeout(referralTimerRef.current);
          }
          validateReferralCode(value, false);
        }
        break;
      default:
        break;
    }

    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // ========== FORM SUBMIT ==========
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    const fullNameError = validateFullName(formData.fullName);
    if (fullNameError) newErrors.fullName = fullNameError;

    const phoneError = validatePhoneNumber(formData.phoneNumber);
    if (phoneError) newErrors.phoneNumber = phoneError;

    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Only check referral if provided AND validation completed AND invalid
    if (formData.referralCode && formData.referralCode.trim().length >= 3) {
      if (referralValidation.isValidating) {
        toast.error('Please wait for referral code validation');
        return;
      }
      if (!referralValidation.isValid) {
        newErrors.referralCode = 'Invalid referral code. Please check and try again.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      
      registerData.phoneNumber = registerData.phoneNumber.replace(/[\s-]/g, '');
      
      // Only include referral code if valid
      if (registerData.referralCode && referralValidation.isValid) {
        registerData.referralCode = registerData.referralCode.trim().toUpperCase();
      } else {
        delete registerData.referralCode; // Remove if invalid or empty
      }
      
      await register(registerData);
      toast.success('Account created successfully! 🎉');
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ========== CLEANUP ==========
  useEffect(() => {
    return () => {
      if (referralTimerRef.current) {
        clearTimeout(referralTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-darker via-dark to-slate-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary p-12 flex-col justify-between">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4">Wealth</h1>
          <p className="text-xl text-white/90">Start Your Trading Journey</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <TrendingUp className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-xl font-semibold text-white">5-Minute Rounds</h3>
              <p className="text-white/80">Fast-paced predictions, instant results</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Wallet className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-xl font-semibold text-white">Low Entry</h3>
              <p className="text-white/80">Start trading from just ₦100</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Shield className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-xl font-semibold text-white">Secure & Licensed</h3>
              <p className="text-white/80">Your funds are safe with us</p>
            </div>
          </div>
        </div>

        <p className="text-white/60 text-sm">
          © 2024 Wealth. All rights reserved.
        </p>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Wealth
            </h1>
            <p className="text-gray-400 mt-2">Start Your Journey</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-slate-700">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400 mb-6">Join thousands of traders</p>

            {/* Required Fields Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
              <p className="text-blue-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                Fields marked with <span className="text-red-500">*</span> are required
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <InputField
                label="Full Name"
                name="fullName"
                placeholder="Enter your full name"
                required={true}
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.fullName}
              />

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition pr-12 ${
                      errors.phoneNumber 
                        ? 'border-red-500 focus:ring-red-500' 
                        : formData.phoneNumber?.length > 0 && !errors.phoneNumber
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-slate-600 focus:ring-primary focus:border-transparent'
                    }`}
                    placeholder="08012345678"
                    required
                    maxLength={11}
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {errors.phoneNumber && <XCircle size={18} className="text-red-500" />}
                    {formData.phoneNumber?.length === 11 && !errors.phoneNumber && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
                  </div>
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.phoneNumber}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must start with 0 and be exactly 11 digits (e.g., 08012345678)
                </p>
              </div>

              {/* Username */}
              <InputField
                label="Username"
                name="username"
                placeholder="Choose a username"
                required={true}
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.username}
              />

              {/* Email */}
              <InputField
                label="Email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required={true}
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
              />

              {/* Password Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition pr-10 ${
                        errors.password 
                          ? 'border-red-500 focus:ring-red-500' 
                          : formData.password?.length >= 8 && !errors.password
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-slate-600 focus:ring-primary focus:border-transparent'
                      }`}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition pr-10 ${
                        errors.confirmPassword 
                          ? 'border-red-500 focus:ring-red-500' 
                          : formData.confirmPassword?.length >= 8 && formData.confirmPassword === formData.password
                          ? 'border-green-500 focus:ring-green-500'
                          : 'border-slate-600 focus:ring-primary focus:border-transparent'
                      }`}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Password must contain:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${formData.password?.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
                    {formData.password?.length >= 8 ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-gray-500'}`}>
                    {/[A-Z]/.test(formData.password) ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-gray-500'}`}>
                    {/[a-z]/.test(formData.password) ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-gray-500'}`}>
                    {/[0-9]/.test(formData.password) ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    One number
                  </div>
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Referral Code <span className="text-gray-500">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition pr-10 uppercase ${
                      errors.referralCode || (!referralValidation.isValidating && formData.referralCode && !referralValidation.isValid && referralValidation.message)
                        ? 'border-red-500 focus:ring-red-500'
                        : referralValidation.isValid
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-slate-600 focus:ring-primary focus:border-transparent'
                    }`}
                    placeholder="Enter referral code (e.g., ABC123)"
                    maxLength={15}
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {referralValidation.isValidating && (
                      <Loader2 size={18} className="text-blue-500 animate-spin" />
                    )}
                    {!referralValidation.isValidating && referralValidation.isValid && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
                    {!referralValidation.isValidating && formData.referralCode && formData.referralCode.length >= 3 && !referralValidation.isValid && referralValidation.message && (
                      <XCircle size={18} className="text-red-500" />
                    )}
                  </div>
                </div>
                
                {/* Referral Validation Messages */}
                {referralValidation.isValidating && (
                  <p className="mt-1 text-sm text-blue-400 flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin" />
                    Validating referral code...
                  </p>
                )}
                
                {!referralValidation.isValidating && referralValidation.message && (
                  <p className={`mt-1 text-sm flex items-center gap-1 ${
                    referralValidation.isValid ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {referralValidation.isValid ? (
                      <CheckCircle size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    {referralValidation.message}
                  </p>
                )}
                
                {errors.referralCode && !referralValidation.message && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.referralCode}
                  </p>
                )}
                
                {!formData.referralCode && (
                  <p className="mt-1 text-xs text-gray-500">
                    Have a referral code? Enter it to get bonus rewards!
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || referralValidation.isValidating}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-4 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-6"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:text-primary/80 font-semibold">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
