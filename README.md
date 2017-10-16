# Herkkujemma

An experimental cooking recipe service to explore developing a node.js backend server with different frontend implementations.  

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Working node.js and npm installation.
An Auth0 (free) account is required for access control mechanism. 

```
See README-AUTH.MD for configuring Auth0 via their web interface.
```

### Installing backend server

Install required node packages via npm and create the server-config (see also README-AUTH):


```
cd hj-backend
npm install express express-jwt auth0-api-jwt-rsa-validation --save

```

```
cd hj-backend
cp server-config.js.example server-config.js
edit server-config.js
```

You should be able to start the server without errors with "node server" "http://yourserver:port/recipes"

### Installing frontend server(s)

Currently there is only minimal node+express+ejs frontend server included.

Install required node packages via npm and create the server-config (see also README-AUTH):

```
cd cd hj-frontend-express-ejs
npm install express ejs superagent --save

```

```
cd cd hj-frontend-express-ejs/
cp server-config.js.example server-config.js
edit server-config.js
```

You should be able to start the server without errors with "node server" and browse "http://yourserver:port/"

## Running the tests

I haven't thought about this yet :(

### Break down into end to end tests

I haven't thought about this yet :(

```
Give an example
```

### And coding style tests

I haven't thought about this yet :(

```
Give an example
```

## Deployment

Add additional notes about how to deploy this on a live system

## Built With

* [Express](https://expressjs.com/) - Minimal web framework for node.js
* [Auth0](https://auth0.com/) - Authentication and authorization as service


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

* Stack overflow for being an invaluable source os practical information
