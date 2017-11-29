const mongoose = require('mongoose');
const validator = require('validator');
const shortId = require('shortid');
const uniqueValidator = require('mongoose-unique-validator');

var ChefSchema = new mongoose.Schema({
  shortId: {
    type: String,
    unique: true,
    default: shortId.generate
  },
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
  sub: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true,
    unique: true,
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
    name: {
      type: String,
      require: true
    },
    shortId: {
      type: String,
      require: true
    },
    pictureUrl: {
      type: String
    }
  }]
});

ChefSchema.plugin(uniqueValidator);

ChefSchema.pre('save', function(next) {
  var chef = this;
  chef.updatedAt = new Date().getTime();
  next();
});

var Chef = mongoose.model('Chef', ChefSchema);

module.exports = {Chef};
