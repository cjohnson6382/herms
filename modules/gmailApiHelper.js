'use strict';

var gmailApiHelper = (function () {
    var GMAIL = google.gmail('v1');
    return {
        createAppLabel: function (oauth2Client, callback) {
            GMAIL.users.labels.create({
                auth: oauth2Client,
                userId: 'me',
                fields: 'id, name',
                resource: {
                    labelListVisibility: 'labelHide',
                    messageListVisibility: 'hide',
                    name: 'hermesis'
                }   
            }, function (err, response) {
                if (err) {
                    console.log('error creating the hermesis label in user inbox', err);
                } else {
                    console.log('successfully created hermesis label in user inbox', response);
                    callback();
                }   
            }); 
        },  
        labelEmail: function (oauth2Client, messageId, labelId, callback) {
            console.log('labelEmail messageId: ', messageId, labelId);
            GMAIL.users.messages.modify({
                auth: oauth2Client,
                userId: 'me',
                id: messageId,
                resource: {
                    addLabelIds: [labelId]
                }   
            }, function (err, response) {
                if (err) {
                    console.log('error labeling the supplied email with Hermesis', err);
                } else {
                    console.log('email labeled with hermesis: ', response);
                }
            });
        },
        getGmailMessage: function (oauth2Client, messageId, callback) {
            GMAIL.users.messages.get({
                auth: oauth2Client,
                userId: 'me',
                id: messageId
            }, function (err, response) {
                if (err) {
                    console.log('error calling gmail API: ', err);
                } else {
                    console.log('gmail api successfully called: ', response);
                    callback(response.id);
                }
            });
        },
        checkForHermesisLabel: function (oauth2Client, callback) {
            GMAIL.users.labels.list({
                auth: oauth2Client,
                userId: 'me',
            }, function (err, response) {
                if (err) {
                    console.log('error checking for hermesis label: ', err);
                } else {
//                    console.log('response.labels in checkForHermesisLabel: ', response);
                    var names = {};
                    response.labels.map(function (obj) {
                        names[obj.name] = obj.id;
                    });
                    console.log('names in the checkforhermesislabel function: ', names);
                    var labelnames = Object.keys(names);
                    var hermesis_present = labelnames.indexOf('hermesis');
                    if (hermesis_present === -1) {
                        gmailApiHelper.createAppLabel(oauth2Client, function () {
                            console.log('created label');
                            callback(names['hermesis']);
                        });
                    } else {
                        console.log('label already exists');
                        callback(names['hermesis']);
                    }
                }
            });
//  check whether the hermesis label exists, return if it does, create if it doesn't:
//      when you list labels, it returns an array of objects:
//          labelslist.map(function (current) {
//              return current.name;
//          });;


        },
    }
})();

module.exports = {
    gmailApiHelper: gmailApiHelper
};
