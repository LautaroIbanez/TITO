import yahooFinance from 'yahoo-finance2';

// Suppress the ripHistorical notice
yahooFinance.suppressNotices(['ripHistorical']);

// Export the configured instance
export default yahooFinance; 