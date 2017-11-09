const mongoose = require('mongoose');
const validator = require('validator');
const _ = require('lodash');

var ChefSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true,
    validate: {
          validator: validator.isEmail,
          message: '{VALUE} is not a valid email'
        }
  },
  name: {
    type: String,
    required: true,
    minlength: 3
  },
  picture: {
    type: String
  },
  language: {
      type: String,
      required: true
  },
  recipes: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      require: true
    },
    name: {
      type: String,
      require: true
    },
    picture: {
      type: String
    }
  }]
});


var Chef = mongoose.model('Chef', ChefSchema);

module.exports = {Chef};
