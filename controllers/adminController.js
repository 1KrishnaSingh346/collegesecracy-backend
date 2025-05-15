// controllers/adminController.js
import { User } from '../models/User.js';

// controllers/adminController.js
const getAllUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        status: 'fail',
        message: 'Access Denied' 
      });
    }

    const users = await User.find().select('-password');
    res.status(200).json({
      status: 'success',
      data: {
        users // Wrap users in data object
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      status: 'error',
      message: 'Server Error' 
    });
  }
};

export default getAllUsers;
