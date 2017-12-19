// declare dependencies
const express = require('express');
const request = require('superagent');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet')
const session = require('express-session');
const LokiStore = require('connect-loki')(session);
const dotenv = require('dotenv');
const passport = require('passport');

// load server and auth configs
dotenv.load();
const {getPublicAccessToken,userStrategy,userAuthParams} = require('./auth/auth.js');

const {addDatesToRecipes} = require('./util/util.js');

passport.use(userStrategy);
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

// create express app
const app = express();
app.use(helmet());
app.use(logger(process.env.NODE_ENV == 'production' ? 'short' : 'dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// aws image server baseurl and bucket
// @todo move elsewhere
app.locals.imageServer = process.env.AWS_URL;
app.locals.imageDir = process.env.AWS_BUCKET;
// google analytics tag id if defined
app.locals.analyticsId = process.env.ANALYTICS_ID;

// set the directory to serve static assets
app.use(express.static(__dirname + '/public', { maxAge: '1d' }));

// setup session persistence
// @todo change this, loki ttl is broken
app.use(
  session({
    store: new LokiStore(
      {path: '../data-hj-ejs/session-store.db',
      logErrors: true,
    ttl: 600}),
    secret: 'shhhhhhhh22',
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

// set the view engine to use EJS and the default views directory
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views/');

// force all logged in users without saved profile to signup
app.use((req, res, next) => {

  if(req.user) {
    if (req.originalUrl === '/callback' ||
        req.originalUrl.startsWith('/chefs/signup') ||
        req.originalUrl === '/logout') {
      return next();
    }
    if(!req.user.hasProfile) {
      return res.redirect('/chefs/signup');
    }
  }
  next();
});

// Public homepage without access control
app.get('/', getPublicAccessToken, function(req, res, next){

  request
    .get(process.env.BACKEND + '/recipes?limit=6')
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      let recipes = addDatesToRecipes(data.body);
      res.render('index', {nav:'index', loggedIn: req.user, recipes: recipes} );
    })
    .catch((err) => {
        return next(err);
    });
});

// static about page
app.get('/about', function(req, res){
  res.render('about', {nav:'about', loggedIn: req.user});
});

// setup chefs and recipes routes
let routes = require('./routes');
routes.init(app);

// auth routes
app.get('/login', passport.authenticate('auth0', userAuthParams),
  function(req, res) {
    res.redirect("/");
});

app.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy(function (err) {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.get( '/callback', passport.authenticate('auth0', {
    failureRedirect: '/failure'
  }),
  function(req, res, next) {

    request
     .get(process.env.BACKEND + '/chefs/me')
     .set('Authorization', 'Bearer ' + req.user.accessToken)
     .then((data) => {
       req.user.hasProfile = true;
       res.redirect(req.session.returnTo || '/chefs/me');
     })
     .catch((err) => {
       if(err.status == '404') {
         req.user.hasProfile = false;
         res.redirect('/chefs/signup');
       } else {
         return next(err);
       }
     });
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

// catch all 404's
app.use(function (req, res, next) {
  res.status(404).render('404');
});

// show error page on 500's.
app.use(function (err, req, res, next) {
  if(err.status == '401') {
    console.log('Token seems to have expired');
    return res.redirect('/login');
  }
  console.error(err, err.stack);
  res.status(500).render('500');
});

// launch the frontend server
app.listen(process.env.PORT, () => {
  console.log(`Started on port ${process.env.PORT}, env: ${process.env.NODE_ENV}`);
});
