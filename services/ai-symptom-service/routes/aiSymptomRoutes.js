const express = require('express');
const router = express.Router();
const aiSymptomController = require('../controllers/aiSymptomController');

router.post('/analyze', aiSymptomController.analyzeSymptoms);
router.get('/history', aiSymptomController.getAnalysisHistory);

module.exports = router;
