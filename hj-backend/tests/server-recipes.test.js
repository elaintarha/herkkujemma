const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');

const {app} = require('./../server');
const {Chef} = require('./../models/chef');
const {Recipe} = require('./../models/recipe');

const {chefs,recipes,populateChefs,populateRecipes} = require ('./seed/seed');

beforeEach(populateChefs);
beforeEach(populateRecipes);

describe('POST /recipes', () => {
  it('should create a recipe stub', (done) => {

    var name = 'Delicious test meal';
    var description = 'Deliciously cooked meal for testing';
    var chef = chefs[0]._id.toHexString();
    var locale = chefs[0].locale;

    request(app)
      .post('/recipes')
      .send({name, description, chef, locale})
      .expect(200)
      .expect((res) => {
        expect(res.body.recipe._id).toBeTruthy();
        expect(res.body.recipe.name).toBe(name);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({name}).populate('chef').then((recipe) => {
          expect(recipe).toBeTruthy();
          expect(recipe.name).toBe(name);
          expect(recipe.description).toBe(description);
          expect(recipe.chef._id).toEqual(chefs[0]._id);
          expect(recipe.chef.name).toBe(chefs[0].name);
          expect(recipe.locale).toBe(chefs[0].locale);
          done();
        }).catch((err) => done(err));
      });
  });

  it('should return validation errors if stub invalid', (done) => {
    var name = 'Delicious test meal';
    var description = '';

    request(app)
      .post('/chefs')
      .send({name, description})
      .expect(400)
      .end((err) => {
        if(err) {
          return done(err);
        }
        Chef.findOne({name}).then((recipe) => {
          expect(recipe).toBeFalsy();
          done();
        });
      });
  });
});

describe('PATCH /recipes', () => {
  it('should update a recipe stub', (done) => {

    var shortId = recipes[0].shortId;

    var name = 'Delicious test meal';
    var description = 'Deliciously cooked meal for testing';
    var chef = chefs[1]._id.toHexString();
    var locale = chefs[1].locale;

    request(app)
      .patch('/recipes')
      .send({shortId, name, description, chef, locale})
      .expect(200)
      .expect((res) => {
        expect(res.body.recipe._id).toBeTruthy();
        expect(res.body.recipe.name).toBe(name);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({name}).populate('chef').then((recipe) => {
          expect(recipe).toBeTruthy();
          expect(recipe.name).toBe(name);
          expect(recipe.description).toBe(description);
          expect(recipe.chef._id).toEqual(chefs[1]._id);
          expect(recipe.chef.name).not.toBe(chefs[0].name);
          expect(recipe.locale).toBe(chefs[0].locale);

          done();
        }).catch((err) => done(err));
      });
  });

  it('should not update other users recipe', (done) => {

    var shortId = recipes[0].shortId;

    var name = 'Delicious test meal';
    var description = 'Deliciously cooked meal for testing';
    var chef = chefs[0]._id.toHexString();
    var locale = chefs[0].locale;

    request(app)
      .patch('/recipes')
      .send({shortId, name, description, chef, locale})
      .expect(400)
      .expect((res) => {
        expect(res.body._id).toBeFalsy();
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({shortId}).populate('chef').then((recipe) => {
          expect(recipe).toBeTruthy();
          expect(recipe.name).not.toBe(name);
          expect(recipe.description).not.toBe(description);
          expect(recipe.chef._id).not.toEqual(chefs[0]._id);
          expect(recipe.chef.name).not.toBe(chefs[0].name);
          done();
        }).catch((err) => done(err));
      });
  });
});

describe('DELETE /recipes', () => {
  it('should delete specified recipe', (done) => {

    var shortId = recipes[0].shortId;
    var chef = chefs[1]._id.toHexString();

    request(app)
      .delete('/recipes')
      .send({shortId, chef})
      .expect(200)
      .expect((res) => {
        expect(res.body.recipe._id).toBeTruthy();
        expect(res.body.recipe.shortId).toBe(shortId);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({shortId}).populate('chef').then((recipe) => {
          expect(recipe).toBeFalsy();
          done();
        }).catch((err) => done(err));
      });
  });

  it('should not delete other users recipe', (done) => {

    var shortId = recipes[0].shortId;
    var chef = chefs[0]._id.toHexString();

    request(app)
      .delete('/recipes')
      .send({shortId, chef})
      .expect(400)
      .expect((res) => {
        expect(res.body.recipe).toBeFalsy();
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({shortId}).populate('chef').then((recipe) => {
          expect(recipe).toBeTruthy();
          done();
        }).catch((err) => done(err));
      });
  });
});

describe('GET /recipes', () => {
  it('should get specified recipe', (done) => {

    var shortId = recipes[0].shortId;

    request(app)
      .get('/recipes/'+shortId)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBeTruthy();
        expect(res.body.shortId).toBe(shortId);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({shortId}).then((recipe) => {
          expect(recipe).toBeTruthy();
          expect(recipe.shortId).toBe(shortId);
          done();
        }).catch((err) => done(err));
      });
  });
});

describe('GET /recipes/search', () => {
  it('should find specified recipe by exact name', (done) => {

    var name = recipes[0].name;

    request(app)
      .get('/recipes/search/'+name)
      .expect(200)
      .expect((res) => {
        expect(res.body.recipes).toBeTruthy();
        expect(res.body.recipes[0].name).toBe(name);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        done();
      });
  });

  it('should find specified recipe by start of name', (done) => {

    var name = recipes[0].name;
    name = name.split(" ")[0];
    request(app)
      .get('/recipes/search/'+name)
      .expect(200)
      .expect((res) => {
        expect(res.body.recipes).toBeTruthy();
        expect(res.body.recipes[0].name).toBe(recipes[0].name);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        done();
      });
  });

  it('should find specified recipe by end of name', (done) => {

    var name = recipes[0].name;
    name = name.split(" ")[1];
    request(app)
      .get('/recipes/search/'+name)
      .expect(200)
      .expect((res) => {
        expect(res.body.recipes).toBeTruthy();
        expect(res.body.recipes[0].name).toBe(recipes[0].name);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        done();
      });
  });
});
