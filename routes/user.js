var express = require('express');
var router = express.Router();
var user = require('./../controllers/user');
const isAuthenticated = require('./../config/passport').isAuthenticated;

// public routes
router.post('/forgot', user.postForgot);
router.post('/reset/:token', user.postReset);

router.use(isAuthenticated);

// secure routes
router.get('/account/profile', user.getAccount);
router.post('/account/profile', user.postUpdateAccount);
router.post('/account/password', user.postUpdatePassword);
router.post('/account/delete', user.postDeleteAccount);
router.get('/account/verify/:token', user.getVerifyEmailToken);
router.get('/account/verify', user.getVerifyEmail);

module.exports = router;