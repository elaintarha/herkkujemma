// declare dependencies
const express = require('express');
const request = require('superagent');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet')
const session = require('express-session');
var LokiStore = require('connect-loki')(session);
const dateFormat = require('dateformat');
const objectIdToTimestamp = require('objectid-to-timestamp');
const dotenv = require('dotenv');
const passport = require('passport');
const ensureUserLoggedIn = require('connect-ensure-login').ensureLoggedIn();

const multer  = require('multer');
var storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// load server, auth and s3 configs
dotenv.load();
const {serverAuth,userStrategy,userAuthParams} = require('./auth/auth.js');
const s3 = require('./aws/s3.js');

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
app.use(helmet());
app.use(logger(process.env.NODE_ENV == 'production' ? 'short' : 'dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// aws image server baseurl and bucket
app.locals.imageServer = process.env.AWS_URL;
app.locals.imageDir = process.env.AWS_BUCKET;
// google analytics tag id if defined
app.locals.analyticsId = process.env.ANALYTICS_ID;

// set the directory to serve static assets
app.use(express.static(__dirname + '/public', { maxAge: '1d' }));

// @todo conf session store
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

// use non-interactive credentials to get non-personal content from API
function getPublicAccessToken(req, res, next){

  if(cachedServerAuthTokenTTL>new Date().getTime()) {
    req.access_token = cachedServerAuthToken;
    next();
  } else {
    request
      .post(process.env.AUTH0_SERVER_AUTH_SERVER + '/oauth/token')
      .send(serverAuth)
      .then((result) => {
        if(result.body.access_token) {
                    // convert auth0 seconds to ms
          let tokenTTL = (999 * result.body.expires_in);
          console.log(`New server token, TTL set to: ${tokenTTL} ms`);
          cachedServerAuthTokenTTL = (new Date().getTime() + tokenTTL);
          cachedServerAuthToken = result.body.access_token;
          req.access_token = cachedServerAuthToken;
          next();
        } else {
          res.send(401, 'Unauthorized');
        }
      })
      .catch((err) => {
          return next(err);
      });
    }
}

function addDatesToRecipes(recipes) {

  recipes.forEach(function(recipe) {
    recipe.createdAt = dateFormat(objectIdToTimestamp(recipe._id), 'mediumDate');
  });
  return recipes;
}
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


// get token, add it to request header, get data and render it or deny
// superagent does the handling of backend request
app.post('/recipes', ensureUserLoggedIn, upload.single('dishPicture'), function(req, res, next){

  let pictureUrl = req.body.pictureUrl;
  if(req.file) {
    pictureUrl = s3.savePicture('recipe',req.file.buffer);
  }
  let shortId = req.body.shortId;

  let name = req.body.name;
  let description = req.body.description;
  let locale = req.body.locale;
  let cookingTime = req.body.cookingTime;
  let portions = req.body.portions;

  let ingredients = [];
  for(var i=0;i<req.body["ingredients.title"].length;i++) {
    let ingredient = { title: req.body["ingredients.title"][i],
                       quantity: req.body["ingredients.quantity"][i],
                       unit: req.body["ingredients.unit"][i] };
    if(ingredient.title && ingredient.title.length>0) {
      ingredients.push(ingredient);
    }
  }

  let instructions = [];
  for(var i=0;i<req.body["instructions.description"].length;i++) {
    let instruction = { description: req.body["instructions.description"][i] };
    if(instruction.description && instruction.description.length>0) {
      instructions.push(instruction);
    }
  }

  let thisRequest;

  if(shortId) {
   thisRequest =
    request.patch(process.env.BACKEND + '/recipes')
    .send({shortId, name, description, cookingTime, portions, locale, ingredients, instructions, pictureUrl})
  } else {
   thisRequest =
    request.post(process.env.BACKEND + '/recipes')
    .send({name, description, cookingTime, portions,  locale, ingredients, instructions, pictureUrl})
  }
  thisRequest
    .set('Authorization', 'Bearer ' + req.user.accessToken)
    .then((data) => {
      return handlePostRecipeResult(req, res, data);
    })
    .catch((err) => {
       if(err.status == '400') {
         return handlePostRecipeError(err, req, res);
       }
        return next(err);
    });
});

function handlePostRecipeResult(req, res, data, next) {
  if(data.body.pictureToDelete) {
    s3.delPicture('recipe', data.body.pictureToDelete);
  }
  res.redirect('/recipes/'+data.body.recipe.shortId);
}

function handlePostRecipeError(err, req, res) {
  if(err.response.body.recipe && err.response.body.recipe._id) {
    res.render('recipe-edit', {nav:'recipes', loggedIn: req.user,
    title: 'Edit', recipe: err.response.body.recipe, errorMessage: err.response.body.err});
  } else {
    res.render('recipe-edit', {nav:'recipes', loggedIn: req.user,
    title: 'Add', recipe: err.response.body.recipe, errorMessage: err.response.body.err});
  }
}

app.get('/recipes', getPublicAccessToken, function(req, res, next){
  request
    .get(process.env.BACKEND + '/recipes')
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      let recipes = addDatesToRecipes(data.body);
      res.render('recipes', {nav:'recipes', loggedIn: req.user, recipes: recipes} );
    })
    .catch((err) => {
        return next(err);
    });
});

app.get('/recipes/search', getPublicAccessToken, function(req, res, next){

  let errorMessage = req.query.err
  var name = req.query.name;

  request
    .get(process.env.BACKEND + '/recipes/search/' + name)
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      let recipes = addDatesToRecipes(data.body.recipes);
      res.render('recipes',
      {nav:'recipes', loggedIn: req.user,
      recipes: data.body.recipes, pageTitle: 'Search results for ' + name} );
    })
    .catch((err) => {
        return next(err);
    });
});

app.get('/recipes/add', ensureUserLoggedIn, function(req, res){
  let errorMessage = req.query.err
  let recipe = {name: ''};
  res.render('recipe-edit', {nav:'recipes', loggedIn: req.user, title: 'Add', recipe: recipe, errorMessage: errorMessage});
});

app.get('/recipes/edit/:id', ensureUserLoggedIn, function(req, res, next){

  let errorMessage = req.query.err
  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/recipes/' + id)
    .set('Authorization', 'Bearer ' + req.user.accessToken)
    .then((data) => {
      res.render('recipe-edit', {nav:'recipes',
      loggedIn: req.user, title: 'Edit', recipe: data.body,
      errorMessage: errorMessage});
    })
    .catch((err) => {
        return next(err);
    });
});

app.get('/recipes/delete/:id', ensureUserLoggedIn, function(req, res){
  let errorMessage = req.query.err
  res.render('recipe-delete', {nav:'recipes', loggedIn: req.user, shortId: req.params.id});
});

app.post('/recipes/delete', ensureUserLoggedIn, function(req, res, next){

  let shortId = req.body.shortId;

  request
     .delete(process.env.BACKEND + '/recipes')
     .set('Authorization', 'Bearer ' + req.user.accessToken)
     .send({shortId})
     .then((data) => {
       if(!data.body.recipe._id) {
         return res.status(404).render('404');
       }
       if(data.body.pictureToDelete) {
         s3.delPicture('recipe', data.body.pictureToDelete);
       }
       res.redirect('/chefs/me');
     })
     .catch((err) => {
         return next(err);
     });
});

app.get('/recipes/:id/:title?', getPublicAccessToken, function(req, res, next){

  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/recipes/' + id)
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      if(!data.body._id) {
        return res.status(404).render('404');
      }
      if(!req.params.title || (req.params.title !== data.body.slugName)) {
        res.writeHead(301, { "Location": `/recipes/${id}/${data.body.slugName}` });
        return res.end();
      };
      data.body.createdAt
        = dateFormat(objectIdToTimestamp(data.body._id), 'mediumDate');
      res.render('recipe-view',
      {nav:'recipes', loggedIn: req.user, recipe: data.body, pageTitle: data.body.name});
    })
    .catch((err) => {
        return next(err);
    });
});

// process is be the same for the remaining routes
app.get('/chefs', getPublicAccessToken, function(req, res, next){
  request
    .get(process.env.BACKEND + '/chefs')
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      let chefs = data.body;
      res.render('chefs', {nav:'chefs', loggedIn: req.user, chefs: chefs});
    })
    .catch((err) => {
        return next(err);
    });
});

// chef signup page form
app.get('/chefs/signup', ensureUserLoggedIn, function(req, res){

  let signupFields = {
    name: req.user.nickname,
    email: req.user.emails[0].value,
    avatar: req.user.picture,
    locale: req.user.locale
  };
  let errorMessage = req.query.err;
  res.render('signup', {signupFields, errorMessage});
});

// chef signup page submit
app.post('/chefs/signup', ensureUserLoggedIn, function(req, res, next){

  let email = req.body.email;
  let name = req.body.name;
  let avatar = req.body.avatar;
  let locale = req.body.locale;

  request
   .post(process.env.BACKEND + '/chefs')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .send({email, name, locale, avatar})
   .then((data) => {
     req.user.hasProfile = true;
     res.redirect(req.session.returnTo || '/chefs/me');
   })
   .catch((err) => {
     if(err.status == 400) {
       req.user.hasProfile = false;
       res.render('signup', {nav:'recipes',
       signupFields: err.response.body.chef, errorMessage: err.response.body.err});
     } else {
       return next(err);
     }
   });
});

// chef personal page
app.get('/chefs/me', ensureUserLoggedIn, function(req, res, next){

  request
   .get(process.env.BACKEND + '/chefs/me')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .then((data) => {
     res.render('me',{nav: 'me', loggedIn: req.user, chef: data.body, errorMessage: req.query.err});
   })
   .catch((err) => {
       return next(err);
   });
});

// edit chef profile submit
app.post('/chefs/me', ensureUserLoggedIn, function(req, res, next){

  //let email = req.body.email;
  let name = req.body.name;
  //let avatar = req.body.avatar;
  //let locale = req.body.locale;

  request
   .patch(process.env.BACKEND + '/chefs/1')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .send({name})
   .then((data) => {
     res.redirect('/chefs/me');
   })
   .catch((err) => {
     if(err.status == 400) {
       res.redirect('/chefs/me?err='+err.response.body.err);
     } else {
       return next(err);
     }
   });
});

app.get('/chefs/:id/:title?', getPublicAccessToken, function(req, res, next){

  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/chefs/' + id)
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      if(!data.body._id) {
        return res.status(404).render('404');
      }
      res.render('chef',
      {nav:'chefs', loggedIn: req.user, chef: data.body, pageTitle: data.body.name});
    })
    .catch((err) => {
        return next(err);
    });
});


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

app.use(function (req, res, next) {
  res.status(404).render('404');
});

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
