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
// @todo this doesn't work at all with parameterized routes
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

  var body = _.pick(req.body, ['name', 'description', 'portions', 'cookingTime',
                'chef', 'locale', 'ingredients', 'instructions', 'pictureUrl']);

  let chefIdField = '_id';
  let chefIdValue = body.chef;
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    chefIdField = 'sub';
    chefIdValue = req.user.sub;
  }

  let chef;
  let recipe;

  if(chefIdField == '_id' && !ObjectID.isValid(body.chef)) {
    return res.status(400).send();
  }

  Chef.findOne({[chefIdField]: chefIdValue})
  .then((chefDb) => {
    if(!chefDb) {
      return res.status(400).send();
    }
    chef = chefDb;
    body.chef = chef;

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
    return res.status(200).send({recipe});
  })
  .catch((err) => {
    console.log('Error saving recipe', err);
    res.status(400).send(err.message);
  });

});

app.delete('/recipes', (req, res) => {

    var body = _.pick(req.body, ['shortId', 'chef']);

    let chefIdField = '_id';
    let chefIdValue = body.chef;
    // use the identity from auth0 in prod
    if(req.user && req.user.sub) {
      chefIdField = 'sub';
      chefIdValue = req.user.sub;
    }

    if(chefIdField == '_id' && !ObjectID.isValid(body.chef)) {
      return res.status(400).send();
    }

    let chef;
    let recipe;
    let pictureToDelete;
    Chef.findOne({[chefIdField]: chefIdValue})
    .then((chefDb) => {
      if(!chefDb) {
        return res.status(400).send();
      }
      chef = chefDb;
      return Recipe.findOneAndRemove({shortId: body.shortId, chef:chefDb});
    }, (err) => {
        return res.status(400).send(err.message);
    })
    .then((recipeDb) => {
      if(!recipeDb) {
        throw `Recipe was not found: ${body.shortId}`;
      }
      recipe = recipeDb;
      pictureToDelete = recipeDb.pictureUrl;
      let recipeRef = chef.recipes.find(o => o._id.toHexString() === recipeDb._id.toHexString());
      chef.recipes.pull(recipeRef);
      return chef.save();
    })
    .then((chefDb2) => {
      return res.status(200).send({recipe, pictureToDelete});
    })
    .catch((err) => {
      console.log('Error deleting recipe', err);
      res.status(400).send(err.message);
    });
});

app.patch('/recipes', (req, res) => {

  var body = _.pick(req.body, ['shortId', 'name', 'description', 'portions',
              'cookingTime', 'chef', 'locale', 'ingredients', 'instructions', 'pictureUrl']);

  let chefIdField = '_id';
  let chefIdValue = body.chef;
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    chefIdField = 'sub';
    chefIdValue = req.user.sub;
  }

  let chef;
  let recipe;
  let pictureToDelete;

  if(chefIdField == '_id' && !ObjectID.isValid(body.chef)) {
    return res.status(400).send();
  }

  Chef.findOne({[chefIdField]: chefIdValue})
  .then((chefDb) => {
    if(!chefDb) {
      return res.status(400).send();
    }
    chef = chefDb;
    return Recipe.findOne({shortId: body.shortId}).populate('chef')
  }, (err) => {

      return res.status(400).send(err.message);
  })
  .then((recipeDb) => {
    if(!recipeDb) {
      throw `Recipe was not found: ${body.shortId}`;
    }
    if(recipeDb.chef._id.toHexString() !== chef._id.toHexString()) {
      throw 'This is not your recipe';
    }
    recipeDb.name = body.name;
    recipeDb.description = body.description;
    recipeDb.cookingTime = body.cookingTime;
    recipeDb.portions = body.portions;
    recipeDb.locale = body.locale;
    recipeDb.ingredients = body.ingredients;
    recipeDb.instructions = body.instructions;

    if(recipeDb.pictureUrl !== body.pictureUrl) {
      pictureToDelete = recipeDb.pictureUrl;
      recipeDb.pictureUrl = body.pictureUrl;
    }
    return recipeDb.save();
  })
  .then((recipeDb2) => {
    recipe = recipeDb2;
    let recipeRef = chef.recipes.find(o => o._id.toHexString() === recipeDb2._id.toHexString());
    recipeRef.name = recipeDb2.name;
    recipeRef.pictureUrl = recipeDb2.pictureUrl;
    return chef.save();
  })
  .then((chefDb2) => {
    return res.status(200).send({recipe, pictureToDelete});
  })
  .catch((err) => {
    console.log('Error saving recipe,', err);
    res.status(400).send(err.message);
  });
});

app.get('/recipes', function(req, res){

  Recipe.find().populate('chef')
  .then((recipes) => {
    res.json(recipes);
  }, (err) => {
    res.status(400).send(err);
  });
});

app.get('/recipes/:id', (req, res) => {
  var shortId = req.params.id;

  Recipe.findOne({shortId}).populate('chef')
  .then((recipe) => {
    if(!recipe) {
      return res.status(404).send();
    }
    res.send(recipe);
  })
  .catch((err) => {
    res.status(400).send();
  });

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
  var shortId = req.params.id;

  Chef.findOne({shortId})
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
  var shortId = req.params.id;
  var body = _.pick(req.body, ['name','avatar','locale']);

  Chef.findOneAndUpdate({shortId}, {$set: body}, {new: true})
  .then((chef) => {
    if(!chef) {
      return res.status(404).send();
    }
    res.send({chef});
  }).catch((err) => {
    res.status(400).send();
  });

});

// launch  server
app.listen(process.env.PORT, () => {
    console.log(`Started on port ${process.env.PORT}`);
});

module.exports = {app};
