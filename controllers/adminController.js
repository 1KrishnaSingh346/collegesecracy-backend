export const adminAction = async (req, res, next) => {
    try {
      // Your admin action logic here
      res.status(200).json({
        status: 'success',
        message: "Admin action performed"
      });
    } catch (err) {
      next(err);
    }
  };