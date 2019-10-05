var express = require('express');
var router = express.Router();
var auth = require('./../controllers/auth')


router.post('/login', auth.login);
router.get('/logout', auth.logout);
router.post('/signup', auth.signup);



/* GET users listing. */
router.get('/', async (req, res, next) => {
  res.status(200).send('AUTH Routes');
});
module.exports = router;
