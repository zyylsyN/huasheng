var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.locals.loginbean = req.session.loginbean;
  res.render('index', {});
});

module.exports = router;
