var express = require('express');
var router = express.Router();    
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

router.use(urlencodedParser);
router.get('/', function (req, res) {
	res.render('iframe', { url: req.query.url });
});

module.exports = router;
