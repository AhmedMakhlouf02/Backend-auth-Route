const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/signup/facebook', authController.signupWithFacebook);
router.post('/signup/google', authController.signupWithGoogle);
router.post('/login', authController.login);
router.post('/login/facebook', authController.loginWithFacebook);
router.post('/login/google', authController.loginWithGoogle);
router.post('/reset-password/sendToken', authController.sendToken);
router.post('/reset-password/confirmToken', authController.confirmToken);
router.post('/reset-password/changePassword', authController.changePassword);

module.exports = router;