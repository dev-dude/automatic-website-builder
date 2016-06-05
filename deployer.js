/**
 * Created by david.bailey on 1/16/16.
 * Copyright David Bailey 1/16/16
 */

var hashKey = '-website-assets',
    AWS = require('aws-sdk'),
    //hexoLocation = '/usr/local/lib/node_modules/hexo-cli/bin/',
    hexoLocation = '',
    regularExec = require('child_process').exec,
    wwwDirectory = '/home/ubuntu/server/www/',
    q = require('q'),
    s3site = require('s3-website'),
    builder = require("./builder.js");

AWS.config.accessKeyId = 'InsertAcccessKey';
AWS.config.secretAccessKey = 'InsertsecretAccessKey';
AWS.config.region = 'us-east-1';

var generateHashCode = function() {
    var hash = 0, i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

var s3Bucket = function(masterKeyword,hashCode) {
    var defer = q.defer(),
        fileSafeKeyword = masterKeyword.replace(/ /g, '-'),
        s3NameExtension = hashKey,
        s3BucketName = '',
        code = 0;

    s3BucketName = fileSafeKeyword + hashKey;

    if (hashCode) {
        code = generateHashCode();
        s3BucketName = s3NameExtension + code;
    }

    /*
    var s3bucket = new AWS.S3({params: {
        Bucket: s3BucketName,
        ACL: 'public-read'
        //CreateBucketConfiguration: {
          //  LocationConstraint: 'us-east-1'
        //}
        //GrantReadACP: 'Everyone',
        //GrantRead: 'Everyone'
    }
    });
    */

    /*
    s3bucket.createBucket(function(err, data) {
        console.log(data);
        if (err) {
            console.log(err);
            console.log("*********ERROR**** UNABLE TO CREATE BUCKET Retrying... *********");
            // TODO: DO PROPER IMPLEMENTATION OF RETRY s3Bucket(masterKeyword,true);
        } else {
            console.log('Successfully Created Bucket');

        }
    });
    */
    s3site({
        domain: s3BucketName,
        index: 'index.html'
        /*,
        routes: [{
            Condition: {
                KeyPrefixEquals: 'foo/'
            },
            Redirect: {
                HostName: 'foo.com'
            }
        }]
        */
    }, function(err, website) {
        if (err) {
            throw err;
        } else {
            console.log('########## BUCKET NAME ############');
            console.log(website);
            //s3BucketParams.Bucket = s3BucketName;
            //console.log(s3BucketParams);
            return defer.resolve(s3BucketName);
        }
    });

    if (!hashCode) {
        console.log('Send s3 Deffered Promise');
        return defer.promise;
    }
};

var remoteDeploy = function(masterKeyword) {
    // Start Server
    var serverCommand;
    console.log('******** DEPLOYING ********');
    console.log('change directory');
    console.log(wwwDirectory + masterKeyword);
    process.chdir(wwwDirectory + masterKeyword);
    serverCommand = hexoLocation + 'hexo generate --deploy';
    console.log(serverCommand);
    child = regularExec(serverCommand);
};

var deploy = function(masterKeyword) {
    console.log("*****Deploying deployer.js******");
    masterKeyword = masterKeyword.replace(/ /g, '-');
    s3Bucket(masterKeyword).then(function(s3BucketName){
        console.log("*******S3 DEPLOYER CALLBACK Running Remote Deploy******");
        console.log(s3BucketName);
        builder.editConfigFile(masterKeyword,s3BucketName).then(function(){
            console.log('Remote Deploy Running...');
            remoteDeploy(masterKeyword);
        });
    });
};

//deploy("free antivirus downloads");
module.exports = deploy;
