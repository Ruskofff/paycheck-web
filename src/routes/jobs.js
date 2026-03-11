const express        = require('express');
const jobsController = require('../controllers/jobsController');

const router = express.Router();

router.get('/',        jobsController.getAll);
router.get('/:id',     jobsController.getById);
router.put('/:id',     jobsController.update);

module.exports = router;
