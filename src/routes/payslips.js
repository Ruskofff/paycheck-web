const express             = require('express');
const multer              = require('multer');
const path                = require('path');
const payslipsController  = require('../controllers/payslipsController');

// Stockage temporaire des PDFs uploadés
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

const router = express.Router();

router.get('/',               payslipsController.getAll);
router.get('/job/:jobId',     payslipsController.getByJob);
router.post('/import',        upload.array('pdfs', 20), payslipsController.importPdfs);
router.delete('/:id',         payslipsController.remove);

module.exports = router;
