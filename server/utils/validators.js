// Email validation
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Username validation (3-50 characters, alphanumeric only)
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const re = /^[a-zA-Z0-9]{3,50}$/;
  return re.test(username);
};

// Password validation (8+ chars, 1 uppercase, 1 lowercase, 1 number)
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

// Phone number validation (Nigerian format)
const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Accepts: +2348012345678, 08012345678, 8012345678
  const re = /^(\+?234|0)?[789]\d{9}$/;
  return re.test(phone.replace(/\s/g, '')); // Remove spaces
};

// Amount validation
const validateAmount = (amount) => {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) && parsed > 0;
};

// Bank account number validation (10 digits)
const validateBankAccount = (accountNumber) => {
  if (!accountNumber) return false;
  const re = /^\d{10}$/;
  return re.test(String(accountNumber));
};

// Referral code validation
const validateReferralCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  const re = /^WLT[A-Z0-9]{8,12}$/i; // Matches your referral code format
  return re.test(code.toUpperCase());
};

// Prediction validation (up or down)
const validatePrediction = (prediction) => {
  if (!prediction || typeof prediction !== 'string') return false;
  return ['up', 'down'].includes(prediction.toLowerCase());
};

// UUID validation
const validateUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(uuid);
};

// Safe string sanitization
const sanitizeString = (str, maxLength = 255) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  validatePhoneNumber,
  validateAmount,
  validateBankAccount,
  validateReferralCode,
  validatePrediction,
  validateUUID,
  sanitizeString
};
