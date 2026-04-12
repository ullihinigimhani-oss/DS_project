const express = require('express');
const router = express.Router();
const aiSymptomController = require('../controllers/aiSymptomController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/analyze', authMiddleware, aiSymptomController.analyzeSymptoms);
router.get('/history', authMiddleware, aiSymptomController.getAnalysisHistory);

module.exports = router;
