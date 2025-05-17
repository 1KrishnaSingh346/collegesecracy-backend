import { User } from '../models/User.js';
import CollegeData from '../models/CollegeData.js';
import XLSX from 'xlsx';

// User Management Functions (existing)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (err) {
    console.error('Admin getUsers error:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// College Data Management Functions
/**
 * @desc    Get all college data sets
 * @route   GET /api/admin/college-data
 * @access  Private/Admin
 */
const getAllCollegeData = async (req, res) => {
  try {
    const collegeData = await CollegeData.find().sort({ counsellingType: 1, year: -1, round: 1 });
    res.status(200).json({
      status: 'success',
      results: collegeData.length,
      data: { collegeData }
    });
  } catch (err) {
    console.error('Admin getCollegeData error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch college data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * @desc    Get specific college data by type, year and round
 * @route   GET /api/admin/college-data/:type/:year/:round
 * @access  Private/Admin
 */
// In adminController.js
const getCollegeDataByTypeAndRound = async (req, res) => {
  try {
    const { type, round, year } = req.params;

    // Basic validation
    if (!type || !round) {
      return res.status(400).json({
        status: 'fail',
        message: 'Counselling type and round parameters are required'
      });
    }

    // Build query
    const query = {
      counsellingType: type.toUpperCase(),
      round: round.toUpperCase()
    };

    // Add year if specified (default to current year if not provided)
    const currentYear = new Date().getFullYear();
    query.year = year && !isNaN(year) ? parseInt(year) : currentYear;

    // Restrict to current and previous year for mentees
    if (query.year < currentYear - 1) {
      return res.status(403).json({
        status: 'fail',
        message: 'Mentees can only access current and previous year data'
      });
    }

    // Get the raw data exactly as stored in DB
    const result = await CollegeData.findOne(query)
      .select('-__v -createdAt -updatedAt') // Remove metadata
      .lean();

    if (!result) {
      return res.status(404).json({
        status: 'fail',
        message: `No data found for ${query.counsellingType}, round ${query.round}, year ${query.year}`
      });
    }

    // Return the exact data structure from DB
    res.status(200).json({
      status: 'success',
      counsellingType: result.counsellingType,
      round: result.round,
      year: result.year,
      data: result.data // Return the raw array as stored in DB
    });

  } catch (err) {
    console.error('Error fetching college data:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch college data',
      ...(process.env.NODE_ENV === 'development' && {
        error: err.message
      })
    });
  }
};

/**
 * @desc    Upload college data from file
 * @route   POST /api/admin/college-data/upload
 * @access  Private/Admin
 */
const uploadCollegeData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }
    
    const { counsellingType, year, round } = req.body;
    let data;
    
    // Handle JSON file
    if (req.file.mimetype === 'application/json') {
      data = JSON.parse(req.file.buffer.toString());
    } 
    // Handle Excel file
    else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      req.file.mimetype === 'application/vnd.ms-excel'
    ) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Unsupported file type'
      });
    }
    
    // Validate data
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid data format'
      });
    }
    
    // Check for existing data
    const existingData = await CollegeData.findOne({
      counsellingType: counsellingType.toUpperCase(),
      year: parseInt(year),
      round: round
    });
    
    if (existingData) {
      return res.status(400).json({
        status: 'fail',
        message: 'Data for this year, type and round already exists'
      });
    }
    
    // Create new college data
    const newData = await CollegeData.create({
      counsellingType: counsellingType.toUpperCase(),
      year,
      round,
      data
    });
    
    res.status(201).json({
      status: 'success',
      data: { collegeData: newData }
    });
  } catch (err) {
    console.error('Admin uploadCollegeData error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload college data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * @desc    Update college data
 * @route   PATCH /api/admin/college-data/:id
 * @access  Private/Admin
 */
const updateCollegeData = async (req, res) => {
  try {
    const updatedData = await CollegeData.findByIdAndUpdate(
      req.params.id,
      { 
        data: req.body.data,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedData) {
      return res.status(404).json({
        status: 'fail',
        message: 'College data not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { collegeData: updatedData }
    });
  } catch (err) {
    console.error('Admin updateCollegeData error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update college data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * @desc    Delete college data
 * @route   DELETE /api/admin/college-data/:id
 * @access  Private/Admin
 */
const deleteCollegeData = async (req, res) => {
  try {
    const deletedData = await CollegeData.findByIdAndDelete(req.params.id);
    
    if (!deletedData) {
      return res.status(404).json({
        status: 'fail',
        message: 'College data not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    console.error('Admin deleteCollegeData error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete college data',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export {
  // User management
  getAllUsers,
  
  // College data management
  getAllCollegeData,
  getCollegeDataByTypeAndRound,
  uploadCollegeData,
  updateCollegeData,
  deleteCollegeData
};