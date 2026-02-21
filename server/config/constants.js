module.exports = {
  // User roles
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin'
  },

  // Transaction types
  TRANSACTION_TYPES: {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    BET_PLACE: 'bet_place',
    BET_WIN: 'bet_win',
    BET_LOSS: 'bet_loss',
    FEE: 'fee',
    REFUND: 'refund'
  },

  // Transaction status
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  // Round status
  ROUND_STATUS: {
    UPCOMING: 'upcoming',
    ACTIVE: 'active',
    LOCKED: 'locked',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  // Bet predictions
  PREDICTIONS: {
    UP: 'up',
    DOWN: 'down'
  },

  // Bet results
  BET_RESULTS: {
    WIN: 'win',
    LOSS: 'loss',
    REFUND: 'refund',
    PENDING: 'pending'
  },

  // KYC status
  KYC_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // Payment methods
  PAYMENT_METHODS: {
    NAIRA: 'naira',
    CRYPTO: 'crypto',
    INTERNAL: 'internal'
  },

  // Socket events
  SOCKET_EVENTS: {
    PRICE_UPDATE: 'price_update',
    ROUND_START: 'round_start',
    ROUND_LOCK: 'round_lock',
    ROUND_END: 'round_end',
    BET_PLACED: 'bet_placed',
    BALANCE_UPDATE: 'balance_update'
  }
};
