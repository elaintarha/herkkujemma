// dependencies
require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('express-jwt');
const rsaValidation = require('auth0-api-jwt-rsa-validation');

var {mongoose} = require('./db/mongoose');
const {ObjectID} = require('mongodb');
const {Chef} = require('./models/chef');

const app = express();
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
  }
}
if(process.env.NODE_ENV != 'test') {
 app.use(guard);
}
// routes

// implement the recipes API endpoint
app.get('/recipes', function(req, res){
  // @todo persistence
  // harcoded list for now
  let recipes = [
    {title : 'Salmon soup', release: '2017', chef: 'Jaakko Saari', score: '8.8'},
    {title : 'Nyhtis casserole', release : '2017', chef: 'Irina Slastunina', score: '10'}
  ]

  res.json(recipes);
});

// implement the chefs API endpoints

app.post('/chefs', (req, res) => {
  var body = _.pick(req.body, ['email','name','locale','avatar']);
  var chef = new Chef(body);
  chef.save().then((result) => {
    res.status(200).send(result);
  }, (err) => {
    res.status(400).send(err);
  });
});

app.get('/chefs', (req, res) => {
  Chef.find().then((chefs) => {
    res.json(chefs);
  }, (err) => {
    res.status(400).send(err);
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
      res.status(404).send();
    }
    res.send({chef});
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
