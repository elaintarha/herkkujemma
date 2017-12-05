const _ = require('lodash');
var {mongoose} = require('../db/mongoose');
const {ObjectID} = require('mongodb');
const {Chef} = require('../models/chef');
const {Recipe} = require('../models/recipe');
const express = require('express');

let router = express.Router();

// implement the /recipes API endpoints
router.post('/', (req, res) => {
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
      return res.status(400).send({recipe,err:err.message});
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
    res.status(400).send({recipe, err:err.message});
  });

});

router.delete('/', (req, res) => {
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

router.patch('/', (req, res) => {
  var body = _.pick(req.body, ['_id','shortId', 'name', 'description', 'portions',
              'cookingTime', 'chef', 'locale', 'ingredients', 'instructions', 'pictureUrl']);

  let chefIdField = '_id';
  let chefIdValue = body.chef;
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    chefIdField = 'sub';
    chefIdValue = req.user.sub;
  }

  let chef;
  let recipe = body;
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
    return Recipe.findOne({shortId: body.shortId}).populate('chef');
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
    res.status(400).send({recipe, err:err.message});
  });
});

router.get('/', function(req, res){

  let limit = 299;
  let limitParam = req.query.limit;

  if(limitParam
    && parseInt(limitParam) < limit ) {
      limit = parseInt(limitParam);
    }

  Recipe.find().populate('chef').limit(limit).sort('-_id')
  .then((recipes) => {
    res.json(recipes);
  }, (err) => {
    res.status(400).send(err);
  });
});

router.get('/search/:name', function(req, res){

  var name = req.params.name;

  let limit = 99;
  let limitParam = req.query.limit;

  if(limitParam
    && parseInt(limitParam) < limit ) {
      limit = parseInt(limitParam);
    }

  Recipe.find({name: new RegExp('.*'+name+'.*', "i")}).populate('chef').limit(limit)
  .then((recipes) => {
    res.json({recipes});
  }, (err) => {
    res.status(400).send(err);
  });
});

router.get('/:id', (req, res) => {
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

module.exports = router;
