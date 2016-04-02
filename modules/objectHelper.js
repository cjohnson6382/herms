'use strict';

class DbObject {
    constructor () {
        this.properties = {};
    }

    update (updateobject, callback) {
        console.log('updateobject in DbObject.update: ', updateobject);
        for (var key in updateobject.properties) {
            if (this.properties.hasOwnProperty(key)) {
                this.properties[key] = updateobject[key];
            } else {
                throw new Error('this is not a session object property: ', updateobject[key]);
            }
        }

        callback(this);
    }
}

class SessionObject extends DbObject {
    constructor () {
        super();
        var that = this;
        this._generateSessionId (function (sessionId) {
            that.properties = {
                sessionId: sessionId,
                originalId: '',
                copyId: '',
                pdfPath: '',
                templatefolderPath: '',
                fields: '',
                googleid: '' 
            };
        });
    }

    _generateSessionId (callback) {
        var crypto = require('crypto');
        var hash = crypto.createHash('md5');
        //  hashing the date to create a 'unique' value - so bad; 
        //  should instead get the _id field from the DB and return that
        var data = new Date();  
        hash.on('readable', () => {
            var hashed = hash.read();
            if (hashed) {
                console.log('hashed your data', hashed.toString('hex'));
                callback(hashed.toString('hex'));
            }   
        }); 
        hash.write(data.toString());
        hash.end();
    }
}


//  make the constructor for this   ///////////////////
class AuthObject extends DbObject {
    constructor () {
        super();
        this.properties = {
            token: '',
            googleid: ''
        };
    }
}

module.exports = {
    SessionObject: SessionObject,
    AuthObject: AuthObject
};
