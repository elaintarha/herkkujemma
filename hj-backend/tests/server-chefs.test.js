const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');
const shortId = require('shortid');
const {app} = require('./../server');
const {Chef} = require('./../models/chef');

const {chefs,populateChefs} = require ('./seed/seed');

beforeEach(populateChefs);

describe('POST /chef', () => {
  it('should create a chef', (done) => {
    var email = 'email@example.com';
    var sub = 'auth0|45839584594934';
    var name = 'Testijaakko';
    var locale = 'fi-FI';

    request(app)
      .post('/chefs')
      .send({email, sub, name, locale})
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBeTruthy();
        expect(res.body.shortId).toBeTruthy();
        expect(res.body.email).toBe(email);
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Chef.findOne({email}).then((chef) => {
          expect(chef).toBeTruthy();
          expect(chef.email).toBe(email);
          expect(chef.sub).toBe(sub);
          expect(chef.name).toBe(name);
          expect(chef.locale).toBe(locale);
          done();
        }).catch((err) => done(err));
      });
  });
  it('should return validation errors if req invalid', (done) => {
    var email = 'email@example';
    var name = '';

    request(app)
      .post('/chefs')
      .send({email, name})
      .expect(400)
      .end((err) => {
        if(err) {
          return done(err);
        }
        Chef.findOne({email}).then((chef) => {
          expect(chef).toBeFalsy();
          done();
        });
      });
  });
  it('should not create a user if email in use', (done) => {
    var email = chefs[0].email;
    var name = chefs[0].name;

    request(app)
      .post('/chefs')
      .send({email, name})
      .expect(400)
      .end(done);
  });
});

describe('GET /chefs/:id', () => {
  it('should return specified chef', (done) => {

    request(app)
      .get(`/chefs/${chefs[1].shortId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe(chefs[1].email);
      })
      .end(done);
  });
  it('should return 404 if chef not found', (done) => {
    var id = shortId.generate();

    request(app)
      .get(`/chefs/${id}`)
      .expect(404)
      .end(done);
  });
});

describe('PATCH /chefs/:id', () => {
  it('should update the mutable chef fields', (done ) => {
    var shortId = chefs[0].shortId;
    var objectID = chefs[0]._id;
    var name = 'New Name';
    var avatar = 'some url';
    var locale = 'jp-JP';
    var email = 'crook@example.com';

    request(app)
      .patch(`/chefs/${shortId}`)
      .send({name,avatar,locale,email})
      .expect(200)
      .expect((res) => {
        expect(res.body.chef.name).toBe(name);
        expect(res.body.chef.avatar).toBe(avatar);
        expect(res.body.chef.locale).toBe(locale);
        expect(typeof res.body.chef.updatedAt).toBe('number');
      })
      .end((err) => {
        if(err) {
          return done(err);
        }
        Chef.findById(objectID).then((chef) => {
          expect(chef.name).not.toBe(chefs[0].name);
          expect(chef.avatar).not.toBe(chefs[0].avatar);
          expect(chef.locale).not.toBe(chefs[0].locale);
          done();
        });
      });
  });

  it('should return 404 if chef not found', (done) => {
    var shortId = '34343432';
    var name = 'New Name';

    request(app)
      .patch(`/chefs/${shortId}`)
      .send({name})
      .expect(404)
      .end(done);
  });

});
