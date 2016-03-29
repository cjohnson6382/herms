'use strict';

class DbObject {
    update (updateobject, callback) {
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
        _generateSessionId () {function (sessionId) {
            this.properties = {
                sessionId: sessionId,
                originalId: '',
                copyId: '',
                pdfPath: '',
                templatefolderPath: '',
                fields: ''               
            };
        }}
    }

    _generateSessionId () {
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
        this.properties = {
            this.token = '';
            this.googleid = '';
        };
    }
}

modules.export = {
    SessionObject: SessionObject,
    AuthObject: AuthObject
};
