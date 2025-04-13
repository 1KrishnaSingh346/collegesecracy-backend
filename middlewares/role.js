import AppError from '../utils/appError.js';

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

const checkPremium = (req, res, next) => {
  if (!req.user.premium) {
    return next(new AppError('Please upgrade to premium to access this feature', 402));
  }
  next();
};

export { restrictTo, checkPremium };