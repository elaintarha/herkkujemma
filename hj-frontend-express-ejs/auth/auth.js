const request = require('superagent');
const Auth0Strategy = require('passport-auth0');
const ensureUserLoggedIn = require('connect-ensure-login').ensureLoggedIn();

// credentials for frontend server (for public requests to backend)
var serverAuth = {
  client_id: process.env.AUTH0_SERVER_CLIENT_ID,
  client_secret: process.env.AUTH0_SERVER_CLIENT_SECRET,
  grant_type: 'client_credentials',
  audience: process.env.AUTH0_SERVER_AUDIENCE
}

// passport config
var userStrategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_USER_DOMAIN,
    clientID: process.env.AUTH0_USER_CLIENT_ID,
    clientSecret: process.env.AUTH0_USER_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_USER_CALLBACK_URL || 'http://localhost:3000/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
        // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user

    // add token to req.user for backend server requests
    profile.accessToken = extraParams.access_token;
    return done(null, profile);
  }
);

// auth0 params for interactive auth requests to auth0
var userAuthParams = {
    clientID: process.env.AUTH0_USER_CLIENT_ID,
    domain: process.env.AUTH0_USER_DOMAIN,
    redirectUri: process.env.AUTH0_USER_CALLBACK_URL,
    responseType: 'token id_token',
    audience: process.env.AUTH0_USER_AUDIENCE,
    scope: 'openid profile email'
}

// non-interactive credentials + cache to get non-personal content from API
let cachedServerAuthToken;
let cachedServerAuthTokenTTL = 0;

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

module.exports = {userStrategy, userAuthParams, getPublicAccessToken, ensureUserLoggedIn};
