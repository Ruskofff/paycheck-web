const express         = require('express');
const quotaController = require('../controllers/quotaController');

const router = express.Router();

router.get('/', quotaController.getCurrent);

module.exports = router;
