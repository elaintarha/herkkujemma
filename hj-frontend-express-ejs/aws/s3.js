const AWS = require('aws-sdk');

var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: process.env.AWS_DS,
    credentials: new AWS.Credentials(process.env.AWS_KEY, process.env.AWS_SECRET, null)
  });

module.exports = {s3};
