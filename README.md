# Herkkujemma

An experimental cooking recipe service to explore developing a node.js API server with different client implementations.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Working node.js, npm and mongodb (local or remote) installations
An Auth0 (free) account is required for access control mechanism.

```
See README-AUTH.MD for configuring Auth0 via their web interface.
```
## Installation

Get the project from git:

```
git clone https://github.com/elaintarha/herkkujemma.git ./herkkujemma
```

### Configuring API server

Navigate to API server directory and do npm install:
```
cd herkkujemma/hj-backend
npm init
```
Create and edit the config file (see also README-AUTH.MD):
```
cp config/config.json.example config/config.json
edit config/config.json
```

You should be able to start the server without errors with "node server" and browse "http://yourserver:port/"

### Installing client server(s)

Currently there is only one front included, built with node+express+ejs.
Npm sharp is used for image processing which requires npm node-gyp to be installed.

Navigate to frontend server directory and do npm install:

```
cd cd hj-frontend-express-ejs
npm init

```
 Create and edit the server-config file (see also README-AUTH):
```
cd cd hj-frontend-express-ejs/
cp server-config.js.example server-config.js
edit server-config.js
```

You should be able to start the server without errors with "node server" and browse "http://yourserver:port/"

## Running the tests


### API Server

npm scripts for single and watcher tests are configured.

```
cd hj-backend
npm test
npm run test-watch
```
### Clients

I haven't thought about this yet :(

### And coding style tests

I haven't thought about this yet :(


## Deployment

I haven't thought about this yet :(

## Built With
* [Mongoose]http://mongoosejs.com/) - MongoDB boilerplate help
* [Auth0](https://auth0.com/) - Authentication and authorization as service
* [Express](https://expressjs.com/) - Minimal web framework for node.js


## Contributing

I haven't thought about this yet :(

## Versioning

I haven't thought about this yet :(

## Authors

* **Jaakko Saari** - *Initial work* - [elaintarha](https://github.com/elaintarha)

See also the list of [contributors](https://github.com/elaintarha/herkkujemma/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Stack overflow for being an invaluable source of information
