// dependencies
require('./config/config');

const _ = require('lodash');
const logger = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('express-jwt');
const rsaValidation = require('auth0-api-jwt-rsa-validation');

var {mongoose} = require('./db/mongoose');
const {ObjectID} = require('mongodb');
const {Chef} = require('./models/chef');
const {Recipe} = require('./models/recipe');

const app = express();
app.use(logger('dev'));
app.use(bodyParser.json());

const jwtCheck = jwt({
  secret: rsaValidation(),
  algorithms: ['RS256'],
  issuer: process.env.auth0Issuer,
  audience: process.env.auth0Audience
});

// enable the use of the jwtCheck in all routes
if(process.env.NODE_ENV != 'test') {
  app.use(jwtCheck);
}

// set the default missing/incorrect token message
app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({message:'Missing or invalid token'});
  }
});

// define token auth scopes for routes
const guard = function(req, res, next){
  // case switch list for routes
  switch(req.path){

    // if the request is for recipes it needs general scope
    case '/recipes' : {
      var permissions = ['general'];
      for(var i = 0; i < permissions.length; i++){
        if(req.user.scope.includes(permissions[i])){
          next();
        } else {
          res.send(403, {message:'Forbidden'});
        }
      }
      break;
    }
    // same for the chefs
    case '/chefs': {
      var permissions = ['general'];
      for(var i = 0; i < permissions.length; i++){
        if(req.user.scope.includes(permissions[i])){
          next();
        } else {
          res.send(403, {message:'Forbidden'});
        }
      }
      break;
    }
    // same for the logged in chef
    case '/chefs/me': {
      var permissions = ['general'];
      for(var i = 0; i < permissions.length; i++){
        if(req.user.scope.includes(permissions[i])){
          next();
        } else {
          res.send(403, {message:'Forbidden'});
        }
      }
      break;
    }
    // @todo this doesnt work
    case '/chefs/:id': {

      var permissions = ['general'];
      for(var i = 0; i < permissions.length; i++){
        if(req.user.scope.includes(permissions[i])){
          next();
        } else {
          res.send(403, {message:'Forbidden'});
        }
      }
      break;
    }
    default: {
      console.log('Guard missed path (not good): ', req.path);
      next();
    }
  }
}
if(process.env.NODE_ENV != 'test') {
 app.use(guard);
}
// routes

// implement the recipes API endpoints

app.post('/recipes', (req, res) => {

  var body = _.pick(req.body, ['name', 'description', 'chef', 'locale']);

  let chefIdField = '_id';
  let chefIdValue = body.chef;
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    chefIdField = 'sub';
    chefIdValue = req.user.sub;
  }

  let chef;
  let recipe;

  if(!ObjectID.isValid(body.chef)) {
    return res.status(400).send();
  }

  Chef.findOne({[chefIdField]: chefIdValue})
  .then((chefDb) => {
    if(!chefDb) {
      return res.status(400).send();
    }
    chef = chefDb;
    recipe = new Recipe(body);
    return recipe.save();
  }, (err) => {
      return res.status(400).send(err.message);
  })
  .then((recipeDb) => {
    recipe = recipeDb;
    chef.recipes.push(recipeDb);
    return chef.save();
  })
  .then((chefDb2) => {
    return res.status(200).send(recipe);
  })
  .catch((err) => {
    res.status(400).send(err.message);
  });

});

app.get('/recipes', function(req, res){

  // @todo persistence
  // harcoded list for now
  let recipes = [
    {_id: '4244f', title : 'Salmon soup', release: '2017', chef: 'Jaakko Saari', score: '8.8'},
    {_id: '4244f', title : 'Nyhtis casserole', release : '2017', chef: 'Irina Slastunina', score: '10'},
    {_id: '4244f', title : 'Thai chicken', release : '2017', chef: 'Irina Slastunina', score: '10'},
    {_id: '4244f', title : 'Pumpkin soup', release : '2017', chef: 'Irina Slastunina', score: '10'},
    {_id: '4244f', title : 'Pollo limonello', release : '2017', chef: 'Jaakko Saari', score: '9.2'},
    {_id: '4244f', title : 'Tomato omelet', release : '2017', chef: 'Irina Slastunina', score: '10'}
  ]

  res.json(recipes);
});

app.get('/recipes/:id', (req, res) => {
/*  var id = req.params.id;
  if(!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Chef.findOne({_id: id})
  .then((chef) => {
    if(!chef) {
      return res.status(404).send();
    }
    res.send(chef);
  })
  .catch((err) => {
    res.status(400).send();
  });
  */
  let recipe = {_id: '4244f', title : 'Tomato omelet', release : '2017', chef: 'Irina Slastunina', score: '10'};
  recipe.chef = {name: 'Irina Slastunina', avatar: 'https://scontent.xx.fbcdn.net/v/t1.0-1/p50x50/14192643_1793745170895027_262185511564817726_n.jpg?oh=0a042a72c075f5d1d258662ebfb0192c&oe=5AA3A5D7'}
  res.json(recipe);
});
// implement the chefs API endpoints
app.post('/chefs', (req, res) => {

  var body = _.pick(req.body, ['email','sub','name','locale','avatar']);
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    body.sub = req.user.sub;
  }
  var chef = new Chef(body);
  chef.save().then((result) => {
    res.status(200).send(result);
  }, (err) => {
    res.status(400).send(err.message);
  });
});

app.get('/chefs', (req, res) => {
  Chef.find().then((chefs) => {
    res.json(chefs);
  }, (err) => {
    res.status(400).send(err);
  });
});

app.get('/chefs/me', (req, res) => {

  if(!req.user.sub) {
    return res.status(400).send();
  }

  Chef.findOne({sub: req.user.sub})
  .then((chef) => {
    if(!chef) {
      return res.status(404).send();
    }

    res.send(chef);
  })
  .catch((err) => {
    res.status(400).send();
  });
});

app.get('/chefs/:id', (req, res) => {
  var id = req.params.id;
  if(!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Chef.findOne({_id: id})
  .then((chef) => {
    if(!chef) {
      return res.status(404).send();
    }
    res.send(chef);
  })
  .catch((err) => {
    res.status(400).send();
  });
});

app.patch('/chefs/:id', (req, res) => {
  var id = req.params.id;
  var body = _.pick(req.body, ['name','avatar','locale']);

  if(!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Chef.findOneAndUpdate({_id: id}, {$set: body}, {new: true})
  .then((chef) => {
    if(!chef) {
      return res.status(404).send();
    }
    res.send({chef});
  }).catch((err) => {
    res.status(400).send();
  });

});

// launch backend server
app.listen(process.env.PORT, () => {
    console.log(`Started on port ${process.env.PORT}`);
});

module.exports = {app};
