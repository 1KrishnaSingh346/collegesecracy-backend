export const validateCollegeDataParams = (req, res, next) => {
  const { type, round, year } = req.params;
  
  if (!type || !/^(UPTAC|JOSAA|CSAB)$/i.test(type)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid counselling type (must be UPTAC, JOSAA, or CSAB)'
    });
  }

  if (!round || !/^[1-6]$|^AR$/i.test(round)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid round (must be 1-6 or AR)'
    });
  }

  if (year && year !== 'all' && isNaN(year)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid year parameter'
    });
  }

  next();
};