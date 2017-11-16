// declare dependencies
const express = require('express');
const request = require('superagent');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const ensureUserLoggedIn = require('connect-ensure-login').ensureLoggedIn();

dotenv.load();

// load auth configs
const {serverAuth,userStrategy,userAuthParams} = require('./auth/auth.js');

let cachedServerAuthToken;
let cachedServerAuthTokenTTL = 0;

passport.use(userStrategy);
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

// create express app
const app = express();
app.use(logger('dev'));
app.use(cookieParser());
// @todo conf session store
app.use(
  session({
    secret: 'shhhhhhhhh',
    resave: true,
    saveUninitialized: true
  })
);
app.use(passport.initialize());
app.use(passport.session());

// set the view engine to use EJS and the default views directory
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views/');

// set the directory to serve static assets
app.use(express.static(__dirname + '/public'));

// make a request to the oauth/token auth0 API for (general scope) access token for accessing backend
function getServerAccessToken(req, res, next){

  if(cachedServerAuthTokenTTL>new Date().getTime()) {
    req.access_token = serverToken;
    next();
  } else {
    request
      .post(process.env.AUTH0_SERVER_AUTH_SERVER + '/oauth/token')
      .send(serverAuth)
      .end(function(err, res) {
        if(res.body.access_token){
          cachedServerAuthToken = res.body.access_token;
          cachedServerAuthTokenTTL = new Date().getTime() + (1000 * 3500);
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
});

// static about page
app.get('/about', function(req, res){
  res.render('about');
});

// get token, add it to request header, get data and render it or deny
// superagent does the handling of backend request
app.get('/recipes', getServerAccessToken, function(req, res){
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
});

// process is be the same for the remaining routes
app.get('/chefs', getServerAccessToken, function(req, res){
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
});

// static about page
app.get('/chefs/me', ensureUserLoggedIn, function(req, res){
  res.render('me');
});

app.get('/login', passport.authenticate('auth0', userAuthParams),
  function(req, res) {
    res.redirect("/");
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get( '/callback',
  passport.authenticate('auth0', {
    failureRedirect: '/failure'
  }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/chefs/me');
  }
);

app.get('/failure', function(req, res) {
  var error = req.flash("error");
  var error_description = req.flash("error_description");
  req.logout();
  res.render('failure', {
    error: error[0],
    error_description: error_description[0],
  });
});

// launch the frontend server
app.listen(process.env.PORT, () => {
    console.log(`Started on port ${process.env.PORT}`);
});
