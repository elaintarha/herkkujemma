
const chefRoute = require('./chefs'),
      recipeRoute = require('./recipes');

function init(server) {
    server.use('/chefs', chefRoute);
    server.use('/recipes', recipeRoute);
}

module.exports = {
    init: init
};
