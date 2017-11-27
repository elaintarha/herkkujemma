const mongoose = require('mongoose');
const validator = require('validator');

var RecipeSchema = new mongoose.Schema({
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
    step: {
      type: Number,
      require: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  pictures: [{
    url: {
      type: String,
      trim: true,
      require: true
    }
  }]
});


RecipeSchema.pre('save', function(next) {
  var recipe = this;
  recipe.updatedAt = new Date().getTime();
  next();
});

var Recipe = mongoose.model('Recipe', RecipeSchema);

module.exports = {Recipe};
