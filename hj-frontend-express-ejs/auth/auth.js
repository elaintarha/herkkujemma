const Auth0Strategy = require('passport-auth0');
// credentials for frontend server (for public requests to backend)
var serverAuth = {
  client_id: process.env.AUTH0_SERVER_CLIENT_ID,
  client_secret: process.env.AUTH0_SERVER_CLIENT_SECRET,
  grant_type: 'client_credentials',
  audience: process.env.AUTH0_SERVER_AUDIENCE
}

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

var userAuthParams = {
    clientID: process.env.AUTH0_USER_CLIENT_ID,
    domain: process.env.AUTH0_USER_DOMAIN,
    redirectUri: process.env.AUTH0_USER_CALLBACK_URL,
    responseType: 'token id_token',
    audience: process.env.AUTH0_USER_AUDIENCE,
    scope: 'openid profile general'
}

module.exports = {serverAuth, userStrategy, userAuthParams};
