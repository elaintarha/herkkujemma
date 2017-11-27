const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');

const {app} = require('./../server');
const {Chef} = require('./../models/chef');
const {Recipe} = require('./../models/recipe');

const {chefs,recipes,populateChefs,populateRecipes} = require ('./seed/seed');

beforeEach(populateChefs);
beforeEach(populateRecipes);

describe('POST /recipe', () => {
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
        expect(res.body._id).toBeTruthy();
        expect(res.body.name).toBe(name);
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

describe('PATCH /recipe', () => {
  it('should update a recipe stub', (done) => {

    var _id = recipes[0]._id;

    var name = 'Delicious test meal';
    var description = 'Deliciously cooked meal for testing';
    var chef = chefs[1]._id.toHexString();
    var locale = chefs[1].locale;

    request(app)
      .patch('/recipes')
      .send({_id, name, description, chef, locale})
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBeTruthy();
        expect(res.body.name).toBe(name);
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

    var _id = recipes[0]._id;

    var name = 'Delicious test meal';
    var description = 'Deliciously cooked meal for testing';
    var chef = chefs[0]._id.toHexString();
    var locale = chefs[0].locale;

    request(app)
      .patch('/recipes')
      .send({_id, name, description, chef, locale})
      .expect(400)
      .expect((res) => {
        expect(res.body._id).toBeFalsy();
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Recipe.findOne({_id}).populate('chef').then((recipe) => {
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