// declare dependencies
const express = require('express');
const request = require('superagent');
const {getPublicAccessToken,ensureUserLoggedIn} = require('../auth/auth.js');
const {addDatesToRecipe,addDatesToRecipes} = require('../util/util.js');
const s3 = require('../aws/s3.js');
const multer  = require('multer');
var storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let router = express.Router();

// get token, add it to request header, get data and render it or deny
// superagent does the handling of backend request
router.post('/', ensureUserLoggedIn, upload.single('dishPicture'), function(req, res, next){

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

router.get('/', getPublicAccessToken, function(req, res, next){
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

router.get('/search', getPublicAccessToken, function(req, res, next){

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

router.get('/add', ensureUserLoggedIn, function(req, res){
  let errorMessage = req.query.err
  let recipe = {name: ''};
  res.render('recipe-edit', {nav:'recipes', loggedIn: req.user, title: 'Add', recipe: recipe, errorMessage: errorMessage});
});

router.get('/edit/:id', ensureUserLoggedIn, function(req, res, next){

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

router.get('/delete/:id', ensureUserLoggedIn, function(req, res){
  let errorMessage = req.query.err
  res.render('recipe-delete', {nav:'recipes', loggedIn: req.user, shortId: req.params.id});
});

router.post('/delete', ensureUserLoggedIn, function(req, res, next){

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

router.get('/:id/:title?', getPublicAccessToken, function(req, res, next){

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
      let recipe = addDatesToRecipe(data.body);
      res.render('recipe-view',
      {nav:'recipes', loggedIn: req.user, recipe: recipe, pageTitle: recipe.name});
    })
    .catch((err) => {
        return next(err);
    });
});

module.exports = router;
