// Email validation
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Username validation
const validateUsername = (username) => {
  // 3-50 characters, alphanumeric only
  const re = /^[a-zA-Z0-9]{3,50}$/;
  return re.test(username);
};

// Password validation
const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

// Phone number validation (Nigerian format)
const validatePhoneNumber = (phone) => {
  // Accepts: +2348012345678, 08012345678, 8012345678
  const re = /^(\+?234|0)?[789]\d{9}$/;
  return re.test(phone);
};

// Amount validation
const validateAmount = (amount) => {
  return !isNaN(amount) && amount > 0;
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  validatePhoneNumber,
  validateAmount
};
