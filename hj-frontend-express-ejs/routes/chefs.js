// declare dependencies
const express = require('express');
const request = require('superagent');
const {getPublicAccessToken,ensureUserLoggedIn} = require('../auth/auth.js');

let router = express.Router();

// process is be the same for the remaining routes
router.get('/', getPublicAccessToken, function(req, res, next){
  request
    .get(process.env.BACKEND + '/chefs')
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      let chefs = data.body;
      res.render('chefs', {nav:'chefs', loggedIn: req.user, chefs: chefs});
    })
    .catch((err) => {
        return next(err);
    });
});

// chef signup page form
router.get('/signup', ensureUserLoggedIn, function(req, res){

  let signupFields = {
    name: req.user.nickname,
    email: req.user.emails[0].value,
    avatar: req.user.picture,
    locale: req.user.locale
  };
  let errorMessage = req.query.err;
  res.render('signup', {signupFields, errorMessage});
});

// chef signup page submit
router.post('/signup', ensureUserLoggedIn, function(req, res, next){

  let email = req.body.email;
  let name = req.body.name;
  let avatar = req.body.avatar;
  let locale = req.body.locale;

  request
   .post(process.env.BACKEND + '/chefs')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .send({email, name, locale, avatar})
   .then((data) => {
     req.user.hasProfile = true;
     res.redirect(req.session.returnTo || '/chefs/me');
   })
   .catch((err) => {
     if(err.status == 400) {
       req.user.hasProfile = false;
       res.render('signup', {nav:'recipes',
       signupFields: err.response.body.chef, errorMessage: err.response.body.err});
     } else {
       return next(err);
     }
   });
});

// chef personal page
router.get('/me', ensureUserLoggedIn, function(req, res, next){

  request
   .get(process.env.BACKEND + '/chefs/me')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .then((data) => {
     res.render('me',{nav: 'me', loggedIn: req.user, chef: data.body, errorMessage: req.query.err});
   })
   .catch((err) => {
       return next(err);
   });
});

// edit chef profile submit
router.post('/me', ensureUserLoggedIn, function(req, res, next){

  //let email = req.body.email;
  let name = req.body.name;
  //let avatar = req.body.avatar;
  //let locale = req.body.locale;

  request
   .patch(process.env.BACKEND + '/chefs/1')
   .set('Authorization', 'Bearer ' + req.user.accessToken)
   .send({name})
   .then((data) => {
     res.redirect('/chefs/me');
   })
   .catch((err) => {
     if(err.status == 400) {
       res.redirect('/chefs/me?err='+err.response.body.err);
     } else {
       return next(err);
     }
   });
});

router.get('/:id/:title?', getPublicAccessToken, function(req, res, next){

  var id = req.params.id;

  request
    .get(process.env.BACKEND + '/chefs/' + id)
    .set('Authorization', 'Bearer ' + req.access_token)
    .then((data) => {
      if(!data.body._id) {
        return res.status(404).render('404');
      }
      res.render('chef',
      {nav:'chefs', loggedIn: req.user, chef: data.body, pageTitle: data.body.name});
    })
    .catch((err) => {
        return next(err);
    });
});

module.exports = router;
