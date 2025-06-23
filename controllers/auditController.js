// backend/controllers/auditController.js
import { Audit } from "../models/Audit.js";
export const getMyAuditLogs = async (req, res, next) => {
  try {
    const logs = await Audit.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};


// GET /api/audit/all?userId=xxx&action=Account Deleted
export const getAllAuditLogs = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;

const logs = await Audit.find(filter)
  .populate('userId', 'fullName email role')
  .sort({ timestamp: -1 });

res.status(200).json({ status: 'success', data: logs });


    const filteredLogs = logs.filter(log => log.userId !== null);

    res.status(200).json({ status: 'success', data: filteredLogs });
  } catch (err) {
    next(err);
  }
};

