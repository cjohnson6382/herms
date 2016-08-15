var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../server');
var should = chai.should();

chai.use(chaiHttp);

describe('Blobs', function () {
    it('should hit some middleware?', function (done) {
        chai.request(server)
            .get('/savemetadata')
            .end(function (err, res) {
                res.should.have.status(200);
                done();
            });
    });

});
