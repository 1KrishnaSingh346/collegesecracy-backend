const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');

router.get('/', protect, (req, res) => {
  if (!req.user.isPremium) return res.status(403).json({ msg: "Upgrade to premium" });
  res.json({ tools: ["Tool 1", "Tool 2", "Tool 3"] });
});

module.exports = router;
