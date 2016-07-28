async.waterfall([
    function (callback) {
        fs.readFile('client_secret_tv.json', function (err, content) {
            if (err) {
                console.log('error processing client secerts: ', err);
            } else {
                callback(null, content);
            }   
        });    
    }, 
    function (credentials, callback) {

        var clientSecret = credentials.web.client_secret;
        var clientId = credentials.web.client_id;
        var redirectUrl = credentials.web.redirect_uris[0];

        oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
        callback(null, oauth2Client);
    },  
    function (oauth2Client, callback) {
        authorization_url = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes
            }); 
        callback(null, authorization_url);
    },  
    function (authorization_url, callback) {
        app.get('/', function (req, res) {
            fs.readFile('html/index.html', function (err, content) {
                if (err === null) {
                    res.writeHead(200, {'Content-Type' : 'text/html'});
                   res.end(content);
                } else {
                    console.log("ERR @ reading index.html", err);
                }   
            }); 
        }); 
        app.get('/auth', function (req, res) {
            res.writeHead(200, {'Access-Control-Allow-Origin' : '*'});
            var session = new SessionObject();
            dbCaller.sessionUpdate(session, function (sessionobject) {
//                console.log('session successfully created in DB: ', sessionobject);
//                console.log("session returned to the client:", session.properties.sessionId);
                res.end(JSON.stringify({auth_url: authorization_url, session: session.properties.sessionId}));
            }); 
        });
        app.get('/callback', function (req, res) {
            //  a new session with a sessionId
            oauth2Client.getToken(req.query.code, function (err, token) {
                if (err) {
                    console.log('ERR while getting access token', err);
                }
                oauth2Client.credentials = token;
            });
            res.end('authentication happened');
        });
