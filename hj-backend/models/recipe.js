const mongoose = require('mongoose');
const validator = require('validator');
const shortId = require('shortid');

var RecipeSchema = new mongoose.Schema({
  shortId: {
    type: String,
    unique: true,
    default: shortId.generate
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  description: {
    type: String,
    required: true,
    minlength: 3
  },
  chef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chef'
  },
  locale: {
    type: String,
    trim: true,
    required: true
  },
  cookingTime: {
    type: String,
    trim: true
  },
  portions: {
    type: String,
    trim: true
  },
  updatedAt: {
    type: Number,
    default: null
  },
  ingredients: [{
    title: {
      type: String,
      trim: true,
      require: true
    },
    quantity: {
      type: String,
      trim: true
    },
    unit: {
      type: String,
      trim: true
    }
  }],
  instructions: [{
    description: {
      type: String,
      trim: true
    }
  }],
  pictureUrl: {
      type: String,
      trim: true
    }
});


RecipeSchema.pre('save', function(next) {
  var recipe = this;
  recipe.updatedAt = new Date().getTime();
  next();
});

var Recipe = mongoose.model('Recipe', RecipeSchema);

module.exports = {Recipe};
