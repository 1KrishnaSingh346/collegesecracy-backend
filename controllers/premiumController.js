export const getPremiumContent = async (req, res, next) => {
    try {
      // Your premium content logic here
      res.status(200).json({
        status: 'success',
        data: {
          content: "This is premium content"
        }
      });
    } catch (err) {
      next(err);
    }
  };