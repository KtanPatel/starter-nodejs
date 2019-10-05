var express = require('express');
var router = express.Router();
var authRouter = require('./auth');
var userRouter = require('./user');

router.use('/auth', authRouter);
router.use('/', userRouter);
/* GET home page. */
router.get('/', async (req, res) => {
  res.status(200).send(req.headers);
});

module.exports = router;
