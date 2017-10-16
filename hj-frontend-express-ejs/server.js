// declare dependencies
const express = require('express');
const request = require('superagent');
const serverConfig = require('./server-config');
// create express app
const app = express();

// set the view engine to use EJS and the default views directory
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views/');

// set the directory to serve static assets 
app.use(express.static(__dirname + '/public'));

// params for access token request to auth0 from config file
var authData = {
  client_id: serverConfig.auth0ClientId,
  client_secret: serverConfig.auth0ClientSecret,
  grant_type: 'client_credentials',
  audience: serverConfig.auth0Audience
}

// make a request to the oauth/token auth0 API for (general scope) access token for accessing backend
// @todo caching somehow instead of calling this every time?
function getAccessToken(req, res, next){
  request
    .post(serverConfig.auth0OauthServer + '/oauth/token')
    .send(authData)
    .end(function(err, res) {	 
      if(res.body.access_token){
        req.access_token = res.body.access_token;
        next();
      } else {
        res.send(401, 'Unauthorized');
      }
    })
}

// Public homepage without access control
app.get('/', function(req, res){
  res.render('index');
})

// static about page
app.get('/about', function(req, res){
  res.render('about');
})

// get token, add it to request header, get data and render it or deny
// superagent does the handling of backend request
app.get('/recipes', getAccessToken, function(req, res){
  request
    .get(serverConfig.backendServerAddress + '/recipes')
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        let recipes = data.body;
        res.render('recipes', { recipes: recipes} );
      }
    })
})

// process is be the same for the remaining routes
app.get('/chefs', getAccessToken, function(req, res){
  request
    .get(serverConfig.backendServerAddress + '/chefs')
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        let chefs = data.body;
        res.render('chefs', {chefs : chefs});
      }
    })
})

// launch the frontend server
app.listen(serverConfig.serverPort);