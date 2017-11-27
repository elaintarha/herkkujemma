// declare dependencies
const express = require('express');
const request = require('superagent');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const dateFormat = require('dateformat');
const objectIdToTimestamp = require('objectid-to-timestamp');
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// @todo conf session store
app.use(
  session({
    secret: 'shhhhhhhhh2',
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

function addDatesToRecipes(recipes) {

  recipes.forEach(function(recipe) {
    recipe.createdAt = dateFormat(objectIdToTimestamp(recipe._id), 'mediumDate');
  });
  return recipes;
}
// Public homepage without access control
app.get('/', getPublicAccessToken, function(req, res){

  request
    .get(process.env.BACKEND + '/recipes')
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        let recipes = addDatesToRecipes(data.body);
        res.render('index', {nav:'index', loggedIn: req.user, recipes: recipes} );
      }
    });
});

// static about page
app.get('/about', function(req, res){
  res.render('about', {nav:'about', loggedIn: req.user});
});

// get token, add it to request header, get data and render it or deny
// superagent does the handling of backend request
app.post('/recipes', ensureUserLoggedIn, function(req, res){

  let name = req.body.name;
  let description = req.body.description;
  let locale = req.body.locale;
  let _id = req.body._id;

  let ingredients = [];
  for(var i=0;i<req.body["ingredients.title"].length;i++) {
    let ingredient = { title: req.body["ingredients.title"][i],
                       quantity: req.body["ingredients.quantity"][i],
                       unit: req.body["ingredients.unit"][i] };
    if(ingredient.title && ingredient.title.length>0) {
      ingredients.push(ingredient);
    }
  }

  if(_id) {
    request
     .patch(process.env.BACKEND + '/recipes')
     .set('Authorization', 'Bearer ' + req.user.accessToken)
     .send({_id, name, description, locale, ingredients})
     .end(function(err, data) {
       return handlePostRecipeResult(req, res, err, data);
     });
  } else {
    request
     .post(process.env.BACKEND + '/recipes')
     .set('Authorization', 'Bearer ' + req.user.accessToken)
     .send({name, description, locale, ingredients})
     .end(function(err, data) {
       return handlePostRecipeResult(req, res, err, data);
     });
  }
});

function handlePostRecipeResult(req, res, err, data) {
  if(data.status == 200){
    res.redirect('/recipes/'+data.body._id);
  } else {
    if(req.body._id) {
      res.render('recipe-edit', {nav:'recipes', loggedIn: req.user, title: 'Edit', recipe: req.body, errorMessage: err.response.text});
    } else {
      res.render('recipe-edit', {nav:'recipes', loggedIn: req.user, title: 'Add', recipe: req.body, errorMessage: err.response.text});
    }
  }
}

app.get('/recipes', getPublicAccessToken, function(req, res){
  request
    .get(process.env.BACKEND + '/recipes')
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        let recipes = addDatesToRecipes(data.body);
        res.render('recipes', {nav:'recipes', loggedIn: req.user, recipes: recipes} );
      }
    });
});

app.get('/recipes/add', ensureUserLoggedIn, function(req, res){
  let errorMessage = req.query.err
  let recipe = {name: ''};
  res.render('recipe-edit', {nav:'recipes', loggedIn: req.user, title: 'Add', recipe: recipe, errorMessage: errorMessage});
});

app.get('/recipes/edit/:id', ensureUserLoggedIn, function(req, res){

  let errorMessage = req.query.err
  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/recipes/' + id)
    .set('Authorization', 'Bearer ' + req.user.accessToken)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        res.render('recipe-edit', {nav:'recipes', loggedIn: req.user, title: 'Edit', recipe: data.body, errorMessage: errorMessage});
      }
    })
});

app.get('/recipes/delete/:id', ensureUserLoggedIn, function(req, res){
  let errorMessage = req.query.err
  res.render('recipe-delete', {nav:'recipes', loggedIn: req.user, recipeId: req.params.id});
});

app.post('/recipes/delete', ensureUserLoggedIn, function(req, res){

  let _id = req.body.recipeId;

  request
     .delete(process.env.BACKEND + '/recipes')
     .set('Authorization', 'Bearer ' + req.user.accessToken)
     .send({_id})
     .end(function(err, data) {
       if(data.status == 403){
         res.send(403, '403 Forbidden');
       } else {
         if(!data.body._id) {
           return res.status(404).send("Sorry can't find that!");
         }
         res.redirect('/chefs/me');
       }
     });
});

app.get('/recipes/:id', getPublicAccessToken, function(req, res){

  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/recipes/' + id)
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        return res.send(403, '403 Forbidden');
      } else {
        if(!data.body._id) {
          return res.status(404).send("Sorry can't find that!");
        }
        data.body.createdAt = dateFormat(objectIdToTimestamp(data.body._id), 'mediumDate');
        res.render('recipe-view', {nav:'recipes', loggedIn: req.user, recipe: data.body});
      }
    })
});

// process is be the same for the remaining routes
app.get('/chefs', getPublicAccessToken, function(req, res){
  request
    .get(process.env.BACKEND + '/chefs')
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        let chefs = data.body;
        res.render('chefs', {nav:'chefs', loggedIn: req.user, chefs: chefs});
      }
    })
});

// chef signup page form
app.get('/chefs/signup', ensureUserLoggedIn, function(req, res){

  let signupFields = {
    nickname: req.user.nickname,
    email: req.user.emails[0].value,
    picture: req.user.picture,
    locale: req.user.locale
  };
  let errorMessage = req.query.err;
  res.render('signup', {signupFields, errorMessage});
});

// chef signup page submit
app.post('/chefs/signup', ensureUserLoggedIn, function(req, res){

  let email = req.body.email;
  let name = req.body.nickname;
  let avatar = req.body.avatar;
  let locale = req.body.locale;

  request
   .post(process.env.BACKEND + '/chefs')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .send({email, name, locale, avatar})
   .end(function(err, data) {

     if(data.status == 200){
       req.user.hasProfile = true;
       res.redirect(req.session.returnTo || '/chefs/me');
     } else {
       req.user.hasProfile = false;
       res.redirect('/chefs/signup?err='+err.response.text);
     }
   });
});

// chef personal page
app.get('/chefs/me', ensureUserLoggedIn, function(req, res){

  request
   .get(process.env.BACKEND + '/chefs/me')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .end(function(err, data) {
     if(data.status == 200){
       res.render('me',{nav: 'me', loggedIn: req.user, chef: data.body});
     } else {
        res.render('error');
     }
   });
});

app.get('/chefs/:id', getPublicAccessToken, function(req, res){

  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/chefs/' + id)
    .set('Authorization', 'Bearer ' + req.access_token)
    .end(function(err, data) {
      if(data.status == 403){
        res.send(403, '403 Forbidden');
      } else {
        if(!data.body._id) {
          return res.status(404).send("Sorry can't find that!");
        }
      res.render('chef', {nav:'chefs', loggedIn: req.user, chef: data.body});
      }
    })
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

    request
     .get(process.env.BACKEND + '/chefs/me')
     .set('Authorization', 'Bearer ' + req.user.accessToken)
     .end(function(err, data) {
       if(data.status == 200){
         req.user.hasProfile = true;
         res.redirect(req.session.returnTo || '/chefs/me');
       } else {
         req.user.hasProfile = false;
         res.redirect('/chefs/signup');
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
  res.status(404).send("Sorry can't find that!");
});

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
});

// launch the frontend server
app.listen(process.env.PORT, () => {
    console.log(`Started on port ${process.env.PORT}`);
});
