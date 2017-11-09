// dependencies
const express = require('express');
const app = express();
const jwt = require('express-jwt');
const rsaValidation = require('auth0-api-jwt-rsa-validation');

const serverConfig = require('./server-config');

const jwtCheck = jwt({
  secret: rsaValidation(),
  algorithms: ['RS256'],
  issuer: serverConfig.auth0Issuer,
  audience: serverConfig.auth0Audience
});


// enable the use of the jwtCheck in all routes
app.use(jwtCheck);

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
app.use(guard);

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
})

// implement the chefs API endpoint
app.get('/chefs', function(req, res){
  // @todo persistence// @todo persistence
  // hardcoded list for now
  let chefs = [
    {name : 'Jaakko Saari', avatar: 'https://scontent-arn2-1.xx.fbcdn.net/v/t1.0-1/p160x160/14192643_1793745170895027_262185511564817726_n.jpg?oh=2a03ab82a6f35262b965ed99d46541a3&oe=5A43C046'},
    {name: 'Irina Saari', avatar: 'https://scontent-arn2-1.xx.fbcdn.net/v/t1.0-1/p160x160/19224792_10214266332516057_4019139626130681417_n.jpg?oh=1df9b153dcd91cb0941bad99eee7d911&oe=5A7AE8B5'}
  ];

  res.json(chefs);
})

// launch backend server
app.listen(serverConfig.serverPort);
