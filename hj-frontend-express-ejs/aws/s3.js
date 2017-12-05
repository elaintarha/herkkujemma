const AWS = require('aws-sdk');
const sharp = require('sharp');

var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: process.env.AWS_DS,
    credentials: new AWS.Credentials(process.env.AWS_KEY, process.env.AWS_SECRET, null)
  });

function savePicture(type, file) {

  let bucketKey = process.env.AWS_BUCKET;
  let filePrefix = 'r';

  if(type && type === 'chef') {
    filePrefix = 'c';
  }

  let fileName = filePrefix + new Date().getTime() + '.jpeg';

  sharp(file)
  .resize(800, 800)
  .max()
  .toFormat('jpeg')
  .toBuffer()
  .then(function(data) {

    var params = {Bucket: bucketKey,
                  Key: fileName,
                  Body: data,
                  ACL: 'public-read',
                  ContentType: 'image/jpeg',
                  CacheControl: 'public, max-age=31536000'};

    var result = s3.upload(params, function(err, data) {
      if (err) {
        console.error(err, err.stack); // an error occurred
        return null;
      }
    });
  });
  return fileName;
};

function delPicture(type, fileName) {

  let bucketKey = process.env.AWS_BUCKET;
  var params = {Bucket: bucketKey, Key: fileName};

  var result = s3.deleteObject(params, function(err, data) {
    if (err) {
      console.error(err, err.stack); // an error occurred
    }
  });
};

module.exports.savePicture = savePicture;
module.exports.delPicture = delPicture;
