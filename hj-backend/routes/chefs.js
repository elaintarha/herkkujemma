const _ = require('lodash');
var {mongoose} = require('../db/mongoose');
const {Chef} = require('../models/chef');
const express = require('express');

let router = express.Router();

// implement the /chefs API endpoints
router.post('/', (req, res) => {
  var body = _.pick(req.body, ['email','sub','name','locale','avatar']);
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    body.sub = req.user.sub;
  }
  var chef = new Chef(body);
  chef.save().then((result) => {
    res.status(200).send(result);
  }, (err) => {
    res.status(400).send({err:err.message, chef:body});
  });
});

router.get('/', (req, res) => {

  Chef.find().then((chefs) => {
    res.json(chefs);
  }, (err) => {
    res.status(400).send(err);
  });
});

router.get('/me', (req, res) => {
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

router.get('/:id', (req, res) => {
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

router.patch('/:id', (req, res) => {
  var shortId = req.params.id;
  var body = _.pick(req.body, ['name','email','avatar','locale']);

  let chefIdField = 'shortId';
  let chefIdValue = shortId;
  // use the identity from auth0 in prod
  if(req.user && req.user.sub) {
    chefIdField = 'sub';
    chefIdValue = req.user.sub;
  }

  Chef.findOneAndUpdate({[chefIdField]:chefIdValue}, {$set: body}, {new: true})
  .then((chef) => {
    if(!chef) {
      return res.status(404).send();
    }
    res.send({chef});
  }).catch((err) => {
    console.error(err);
    res.status(400).send({err:err.message});
  });
});

module.exports = router;
