export const mentorTools = async (req, res, next) => {
    try {
      // Your mentor tools logic here
      res.status(200).json({
        status: 'success',
        tools: ["Mentor Tool 1", "Mentor Tool 2"]
      });
    } catch (err) {
      next(err);
    }
  };    