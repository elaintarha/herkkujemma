const {ObjectID} = require('mongodb');

const {Chef} = require('./../../models/chef');

const chefOneId = new ObjectID();
const chefTwoId = new ObjectID();
const recipeOneId = new ObjectID();

const chefs = [{
  _id: chefOneId,
  email: 'yksi@example.com',
  name: 'Irina Saari',
  locale: 'fi-FI',
  avatar: 'https://scontent-arn2-1.xx.fbcdn.net/v/t1.0-1/p160x160/19224792_10214266332516057_4019139626130681417_n.jpg?oh=1df9b153dcd91cb0941bad99eee7d911&oe=5A7AE8B5'
},{
  _id: chefTwoId,
  email: 'kaksi@example.com',
  name: 'Jaakko Saari',
  locale: 'fi-FI',
  avatar: 'https://scontent-arn2-1.xx.fbcdn.net/v/t1.0-1/p160x160/14192643_1793745170895027_262185511564817726_n.jpg?oh=2a03ab82a6f35262b965ed99d46541a3&oe=5A43C046',
  recipes: [{
    recipeid: recipeOneId,
    name: 'Butter chicken'
  }]
}];


const populateChefs = (done) => {
  
  Chef.remove({}).then(() => {
    var chefOne = new Chef(chefs[0]).save();
    var chefTwo = new Chef(chefs[1]).save();

    return Promise.all([chefOne, chefTwo])
  }).then(() => done());
};

module.exports = {
  chefs, populateChefs
};
