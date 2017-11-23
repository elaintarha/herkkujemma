const mongoose = require('mongoose');
const validator = require('validator');

var RecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
    required: true
  },
  updatedAt: {
    type: Number,
    default: null
  },
  ingredients: [{
    name: {
      type: String,
      require: true
    },
    quantity: {
      type: String
    },
    unit: {
      type: String
    }
  }],
  instructions: [{
    step: {
      type: Number,
      require: true
    },
    description: {
      type: String
    }
  }],
  pictures: [{
    url: {
      type: String,
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
