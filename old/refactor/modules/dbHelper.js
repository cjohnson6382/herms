"use strict";

var DbObject = require('./objectHelper.js').DbObject;

class DbQuery {
    constructor (collection, filter, data) {
        var me = this;
        this._setcollection(collection, function (collection_name) {
//            console.log('in setcollection callback: ', collection_name);
            me.collection = collection_name;
        });
        this.filter = filter;
        this.data = data;
    }   

    static get SESSION_COLLECTION () {
        return 'session_data';
    }

    static get AUTH_COLLECTION () {
        return 'stored_auth_tokens';
    }

    getDb (callback) {
        var mongo = require('mongodb');
        var that = this;
        // if the DB is initializd already, do nothing, return DB object
        if (this.db) {
            callback(this.db);
        } else {
           try {
 //              console.log("initializing the DB");
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
                        that.db = db;
  //                      console.log('db is initialized'); 
                        callback();
                   }   
               }); 
           } catch (e) {
               console.log('cannot initialize the DB: ', e); 
           }   
        }   
    }   

    _setcollection (collection, callback) {
        if (collection === 'session') {
            callback(DbQuery.SESSION_COLLECTION);
        } else if (collection === 'auth') {
            callback(DbQuery.AUTH_COLLECTION);
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
    constructor (collection, filter, data) {
        super(collection, filter, data);
    }

    query (callback) {
        var that = this;
        this.getDb(function () {
            //  console.log('variables in the RetrieveQuery.query: ', that.filter);
            try {
                that.db.collection(that.collection).findOne(that.filter, function (err, item) {
                    if (err) {
                        console.log('error trying to retrieve: ', err);
                        throw new Error(err);
                    } else {
                        //  NOTE: item.properties should have the object body*****
                        //  console.log('response to RetrieveQuery.query: ', item, that.collection, that.filter);
                        var dbobject = new DbObject();
                        dbobject.properties = item.properties;
                        dbobject.id = item.properties.id;
                        callback(dbobject);
                    }
                });
            } catch (err) {
                console.log('RetrieveQuery.query throws err: ', that.filter, that.collection);
                throw new Error(err);
            }
        });
     }
}

class UpdateQuery extends DbQuery {
    constructor (collection, filter, data) {
        super(collection, filter, data);
    }

//  @dbobject is an AuthObject or a SessionObject
    query (dbobject, callback) {
        console.log('\n\n\nUpdateQuery instance: ', this.collection, this.filter, this.data);
        var that = this;
        this.getDb(function () {
            dbobject.update(that.data, function (updatedobject) {
                //  console.log('\n\n\nupdatedobject after dbobject update: ', that.filter, updatedobject);
                try {
                    that.db.collection(that.collection).updateOne(that.filter, updatedobject, {upsert: true}, function (err, results) {
                        if (err) {
                            console.log('err updating DB: ', err);
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
        });
    }
}

class GetAndSet extends DbQuery {
    constructor (collection, filter, data) {
        super(collection, filter, data);
        //  console.log('GetAndSet properties: ', collection, filter);
        //  console.log('GetAndSet properties using this.: ', this.collection, this.filter);

        this.get = new RetrieveQuery(collection, filter, data);
        this.set = new UpdateQuery(collection, filter, data);
    }

    query (callback) {
        var that = this;
        that.get.query(function (getresult) {
            //  console.log('in GetAndSet.query; result from get: ', getresult);
            that.set.query(getresult, function (setresult) {
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
