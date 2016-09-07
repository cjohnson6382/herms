'use strict';

//  change the constructor on this so that it takes an object, which populates the properties
class DbObject {
    constructor () {
        this.properties = {};
    }

    update (updateobject, callback) {
        var that = this;
        console.log('\n\nupdateobject in DbObject.update: ', updateobject);
        // should validate this: if the object already has an ID, don't change it
        this.id = updateobject.properties.id;
        for (var key in updateobject.properties) {
            if (this.properties.hasOwnProperty(key)) {
                //  console.log('that key passed the for loop: ', key);
                that.properties[key] = updateobject.properties[key];
            } else {
                throw new Error('this is not an object property: ', key, updateobject.properties[key]);
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
            that.id = sessionId;
            that.properties = {
                id: sessionId,
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
        this.id = '';
        this.properties = {
            token: '',
            id: ''
        };
    }
}

module.exports = {
    SessionObject: SessionObject,
    AuthObject: AuthObject,
    DbObject: DbObject
};
