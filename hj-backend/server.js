// dependencies
require('./config/config');

const logger = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('express-jwt');
const rsaValidation = require('auth0-api-jwt-rsa-validation');

const app = express();
app.use(logger(process.env.NODE_ENV == 'production' ? 'short' : 'dev'));
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

// enforce admin scope for admin pages

const guard = function(req, res, next){
  if(req.path.startsWith('/admin')) {
    var permissions = ['admin'];
    for(var i = 0; i < permissions.length; i++){
      if(req.user.scope.includes(permissions[i])){
        next();
      } else {
        res.send(403, {message:'Forbidden'});
      }
    }
  } else {
    next();
  }
}

if(process.env.NODE_ENV != 'test') {
 app.use(guard);
}

// setup API routes
let routes = require('./routes');
routes.init(app);

// launch  server
app.listen(process.env.PORT, () => {
    console.log(`Started on port ${process.env.PORT}, env: ${process.env.NODE_ENV}`);
});

module.exports = {app};
