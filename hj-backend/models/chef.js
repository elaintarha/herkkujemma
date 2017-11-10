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
          isAsync: false,
          validator: validator.isEmail,
          message: '{VALUE} is not a valid email'
        }
  },
  name: {
    type: String,
    required: true,
    minlength: 3
  },
  avatar: {
    type: String
  },
  locale: {
      type: String,
      required: true
  },
  updatedAt: {
    type: Number,
    default: null
  },
  recipes: [{
    recipeid: {
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

ChefSchema.pre('save', function(next) {
  var chef = this;
  chef.updatedAt = new Date().getTime();
  next();  
});


var Chef = mongoose.model('Chef', ChefSchema);

module.exports = {Chef};
