const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

router.get('/company/:user_id', companyController.getCompanyWithUserInfo);
router.put('/companies/:user_id', companyController.updateCompanyProfile);

module.exports = router;
