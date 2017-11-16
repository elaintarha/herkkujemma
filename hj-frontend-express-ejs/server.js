// declare dependencies
const express = require('express');
const request = require('superagent');
const logger = require('morgan');
const dotenv = require('dotenv');
dotenv.load();

// server credentials and token caching
const {serverAuth} = require('./auth/auth.js');
let serverToken;
let serverTokenTTL = 0;


// create express app
const app = express();
app.use(logger('dev'));

// set the view engine to use EJS and the default views directory
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views/');

// set the directory to serve static assets
app.use(express.static(__dirname + '/public'));

// make a request to the oauth/token auth0 API for (general scope) access token for accessing backend
function getAccessToken(req, res, next){

  if(serverTokenTTL>new Date().getTime()) {
    req.access_token = serverToken;
    next();
  } else {
    request
      .post(process.env.AUTH0_SERVER_AUTH_SERVER + '/oauth/token')
      .send(serverAuth)
      .end(function(err, res) {
        if(res.body.access_token){
          serverToken = res.body.access_token;
          serverTokenTTL = new Date().getTime() + (1000 * 3500);
          req.access_token = res.body.access_token;
          next();
        } else {
          res.send(401, 'Unauthorized');
        }
      });
    }
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
    .get(process.env.BACKEND + '/recipes')
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
    .get(process.env.BACKEND + '/chefs')
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
app.listen(process.env.PORT, () => {
    console.log(`Started on port ${process.env.PORT}`);
});
