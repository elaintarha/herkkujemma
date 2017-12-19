const objectIdToTimestamp = require('objectid-to-timestamp');
const dateFormat = require('dateformat');

function addDatesToRecipes(recipes) {
  recipes.forEach(function(recipe) {
    recipe.createdAt = dateFormat(objectIdToTimestamp(recipe._id), 'mediumDate');
  });
  return recipes;
}

function addDatesToRecipe(recipe) {
  recipe.createdAt = dateFormat(objectIdToTimestamp(recipe._id), 'mediumDate');
  return recipe;
}
module.exports = {addDatesToRecipe, addDatesToRecipes};
