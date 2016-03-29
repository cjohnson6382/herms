"use strict";

class DbQuery {
    constructor (collection, filter, data) {
        this.collection = this._setcollection(collection);
        this.filter = filter;
        this.data = data;
        DbQuery.initializeDb(function (db) {
            this.db = db; 
        }); 
        const SESSION_COLLECTION = 'session_data';
        const AUTH_COLLECTION = 'stored_auth_tokens';
    }   

    static initializeDb (callback) {
        // if the DB is initializd already, do nothing, return DB object
        if (this.db) {
            callback(this.db);
        } else {
           that = this;
           try {
               console.log("initializing the DB");
               var client = mongo.MongoClient;
               var url = 'mongodb://localhost:27017/session_db';
               client.connect(url, function (err, db) {
                   if (err) { 
                       console.log("error connecting to the DB: ", err); 
                       throw new Error(err);
                   } else {
                        db.on('close', function () {
                            db = null;
                        }); 
                        this.db = db; 
                        callback(db);
                   }   
               }); 
           } catch (e) {
               console.log('cannot initialize the DB: ', e); 
           }   
        }   
    }   

    _setcollection (collection) {
        if (collection === 'session') {
           this.collection = DbQuery.SESSION_COLLECTION;
        } else if (collection === 'auth') {
            this.collection = DbQuery.AUTH_COLLECTION;
        } else {
            throw new Error('collection paraeter is not valid; use session or auth');
        }
    }

    query () {
        console.log('this is an abstract method');
    }

    go (callback) {
        DbQuery.initializeDb(function () {
            this.query(callback);
        });
    }

    close (callback) {
        DB.close(false, function (err, result) {
            if (err) {
                console.log('error closing: ', err);
            } else {
                console.log('database is closed', result);
                callback();
            }
        });
    }

    expireSession (filter, callback) {
        this.db.collection(this.collection).deleteOne(filter, callback);
    }
}

class RetrieveQuery extends DbQuery {
    query (callback) {
        try {
            this.db.collection(this.collection).findOne(this.filter, function (err, item) {
                if (err) {
                    throw new Error(err);
                } else {
                    callback(item.session);
                }
            });
        } catch (err) {
            console.log('RetrieveQuery.query throws err: ', this.filter, this.collection);
            throw new Error(err);
        }
    }
}

class UpdateQuery extends DbQuery {

//  @dbobject is an AuthObject or a SessionObject with a 'properties' attribute
//      and an update method
    query (dbobject, callback) {
       //  this used to have 'original' in it, but I don't know why?
       dbobject.update(this.data, function (updatedobject) {
            try {
                this.db.collection(this.collection).updateOne(this.filter, updatedobject, {upsert: true}, function (err, results) {
                    if (err) {
                        throw new Error(err);
                    } else {
                        callback(results.result);
                    }
                });
            } catch (err) {
                console.log('UpdateQuery throws err: ', err);
                throw new Error(err);
            }
        });
    }
}

class GetAndSet extends DbQuery {
    constructor (collection, filter, data) {
        super(collection, filter, data);
        this.get = new RetrieveQuery(collection, filter, data);
        this.set = new UpdateQuery(collection, filter, data);
    }

    query (callback) {
        this.get.query(function (getresult) {
            this.set.query(getresult, function (setresult) {
                callback(setresult);
            });
        });
    }
}

module.exports = {
    DbQuery: DbQuery,
    RetrieveQuery: RetrieveQuery,
    UpdateQuery: UpdateQuery,
    GetAndSet: GetAndSet
};
