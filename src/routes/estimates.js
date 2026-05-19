const express = require('express');
const ctrl    = require('../controllers/estimatesController');
const router  = express.Router();

router.get('/',           ctrl.getAll);
router.get('/job/:jobId', ctrl.getByJob);
router.post('/',          ctrl.upsert);
router.delete('/:id',     ctrl.remove);

module.exports = router;
