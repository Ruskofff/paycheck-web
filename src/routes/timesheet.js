const express             = require('express');
const timesheetController = require('../controllers/timesheetController');

const router = express.Router();

router.get('/job/:jobId',   timesheetController.getByJob);
router.post('/',            timesheetController.create);
router.delete('/:id',       timesheetController.remove);

module.exports = router;
