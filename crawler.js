
console.log("Crawler setup");

var Crawler = require("crawler"),
    keyWordList = [],
    cheerio = require('cheerio'),
    config = require("./config.js"),
    google = require("./google.js"),
    builder = require("./builder.js"),
    internal = require("./googleApi.js"),
    process = require('process'),
    fsExtra = require('fs-extra'),
    path = require('path'),
    // Boilerpipe = require('boilerpipe'),
    deployer = require("./deployer.js"),
    _ = require('underscore'),
    exec = require('child_process').execSync,
    fs = require('fs'),
    argv = require('minimist')(process.argv.slice(2)),
    self = this,
    newestFile = '',
    child,
    q = require('q'),
    c, //THIs is the crawler
    keywordListCount = 0,
    url = require('url'),
    currentKeyword = '',
    nextCounter = 0,
    resultList = [],

    globalLinksToParseInternal = [],
    globalInternalLinksCounter = 0,
    globalInternalLinks = [],

    urlList = [];
$ = cheerio.load('');

console.log(builder);

// ****** CONFIG ******
var googlePages = 6,
    rnnSize = 1536,
    layers = 2,
    temperature = 0.5,
    length = 10000,
    crawlerDirectory = '/home/ubuntu/server/nodecrawler/',
    rnnDirectory = config.selectedRnn,
    test = false;
google.resultsPerPage = 30;
google.timeOutValue = 4000;
google.timeOutRange = 5000;

// If test don't rest the file and clear the directory

var emptyTrainingDirectory = function() {
    var defer = q.defer();
    var removeSampleFile;

    var cvDirectory = rnnDirectory + 'cv';
    var sampleOutput = rnnDirectory + 'sample-output.txt';
    var finalInput = crawlerDirectory + 'input.txt';

    console.log('\n\nEmptying Training Directory');
    fsExtra.emptyDir(cvDirectory, function (err) {
        if (!err) console.log('Successfully Emptied Cv directory: ' + cvDirectory);
        fsExtra.remove(sampleOutput, function (err) {
            console.log('Removing sample ouput directory: ' + sampleOutput);
            fsExtra.remove(finalInput, function (err) {
                console.log('Remove final input.txt file: ' + finalInput); 
                return defer.resolve();
            });
        });
    });
    return defer.promise;
};

if (!test) {
    // reset the file
    fs.truncate('input.txt', 0, function () {
        console.log('Cleared input.txt')
    });

    // empty training directory
    fsExtra.emptyDir(rnnDirectory + 'cv', function (err) {
        if (!err) console.log('Successfully Emptied Cv directory!')
    });
}

var checkNumbersInString = function(string) {
    var length = string.replace(/[^0-9]/g, "").length;
    return (length < 30);
};

var getNewestFile = function(dir) {
    var files = fs.readdirSync(dir);
    // use underscore for max()
    return _.max(files, function (f) {
        var fullpath = path.join(dir, f);

        // ctime = creation time is used
        //  with mtime for modification time
        return fs.statSync(fullpath).ctime;
    });
};

var ruleSet = function(key,pS) {
    var text = $(pS[key]).text();
    var lowerCaseText = text.toLowerCase();
    if (text.length > 200 &&
     text.indexOf('»') === -1 &&
     lowerCaseText.indexOf('privacy policy') === -1 &&
     lowerCaseText.indexOf('terms of use') === -1 &&
     lowerCaseText.indexOf('gallery') === -1 &&
     lowerCaseText.indexOf('©') === -1 &&
     lowerCaseText.indexOf('jquery') === -1 &&
     lowerCaseText.indexOf('var ') === -1 &&
     checkNumbersInString(lowerCaseText)) {
        return true;
    } else {
        return false;
    }
};

var resultFormatter = function(string) {
    var defer = q.defer();
    // remove spaces
    var newString = string.replace(/\s\s+/g, ' ');
    //runBoilerPipe(string).then(function(data){
        //console.log(data);

        // strip html
        newString = newString.replace(/<(?:.|\n)*?>/gm, '');

        // strip comments
        newString = newString.replace(/<!--[\s\S]*?-->/g, '');

        // remove urls
        var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        newString = newString.replace(urlRegex, function(url) {
            return '';
        });
        // remove special characters
        newString = newString.replace(/[^A-Za-z0-9;.,'?() ]/g, '');

        if (newString.length > 200) {
            newString = newString + ' \n\n';
        }

       // defer.resolve(newString);
    // });
    //return defer.promise;

    return newString;
};


//********************
//********************
//********************
//********************
//********************
//******************** THIS IS THE FUNCTION THAT IS CALLED BY BUILDER OVER AND OVER ******************** //
//********************
//********************
//********************
//********************
//********************

var nextKeyword = function(reRun) {
    if (reRun) {
        console.log('NEXT KEYWORD');
        if (keywordListCount < keyWordList.length) {
            console.log('START AGAIN');
            currentKeyword = keyWordList[keywordListCount];
            start(keyWordList[keywordListCount]);
            keywordListCount++
        } else {
            console.log("*******BUILDING*****");
            console.log("*******DEPLOY!!!!!*****");
            deployer(masterKeyword);
        }
    }
    return {keyWordList:keyWordList, currentKeyword: currentKeyword, masterKeyword: masterKeyword, keywordListCount:keywordListCount};
};

//********************
//********************
//********************
//********************
//********************
//******************** THIS IS THE FUNCTION THAT IS CALLED BY BUILDER OVER AND OVER ******************** //
//********************
//********************
//********************
//********************
//********************

var sampleData = function(currentKeyword) {
  child = exec('th sample.lua '+rnnDirectory+'cv/'+newestFile+' -gpuid -0 -temperature '+temperature+' -length '+length+' | tee ./sample-output.txt');
  console.log('Finished Sampling saved to sample-output.txt');
  console.log('Buillldding... : < ) ...');
  builder.builder(currentKeyword,test,nextKeyword);
};


var launchTrainer = function(currentKeyword) {
    console.log('clear url list');
    urlList = [];
    console.log('Starting directory: ' + process.cwd());
    try {
        process.chdir(rnnDirectory);
        console.log('Switch to New directory: ' + process.cwd());

        console.log ('Starting RNN');
        console.log('Params');
        var params = 'th train.lua -data_dir '+crawlerDirectory+'  -rnn_size '+rnnSize+' -num_layers '+layers+' -dropout 0.5 -gpuid -0 | tee ./rnn-output.txt';
        console.log(params);
        child = exec(params);
        newestFile = getNewestFile(rnnDirectory+'cv');
        console.log(newestFile);
        sampleData(currentKeyword);
    }
    catch (err) {
        console.log('chdir: ' + err);
    }
};

//function runBoilerPipe(html) {
//    var defer = q.defer(),
//        boilerpipe = new Boilerpipe({
//        extractor: Boilerpipe.Extractor.ArticleExtractor
//    });
//    boilerpipe.setHtml(html);
//    boilerpipe.getText(function(err, text) {
//        defer.resolve(text);
//    });
//    return defer.promise;
//}


function newCrawler(currentKeyword,urlList) {
    emptyTrainingDirectory().then(function(){

        var inputFile = crawlerDirectory+'input.txt';
        console.log("\nOpening file: " + inputFile);

        var wstream = fs.createWriteStream(inputFile);

        wstream.on('error', function(e) {
            console.log("Error opening file: " +inputFile);
            console.error(e);
        });

        wstream.on('open', function(fd) {

            console.log('Input file ' + inputFile + ' EXISTS and able to open: '+ fs.existsSync(inputFile));
            console.log('\n\n');

            c = new Crawler({
                maxConnections: 10,
                timeout: 10000,
                retries: 1,
                retryTimeout: 5000,
                useragent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36',
                // This will be called for each crawled page
                callback: function (error, result, $) {
                    //console.log(result.options.uri);
                    //console.log(error);
                    console.log("Crawling:");
                    // $ is Cheerio by default

                    //a lean implementation of core jQuery designed specifically for the server
                    if (result && $) {

                        console.log(result.options.uri + " SUCCESS");

                        // var allHtml = $.root().html();

                        var pS = $('body').find('p'),
                            prevPs = '';
                        pS.each(function (key, callback) {

                            //console.log($(pS[key]).text());
                            // remove last sentence because sometimes copyright stuff
                            if (key < pS.length - 4) {
                                if (ruleSet(key, pS)) {
                                    wstream.write(resultFormatter($(pS[key]).text()));
                                }
                            }
                        });

                        /*
                        resultFormatter(allHtml).then(function(data){
                            console.log('Write Chunk');
                            console.log(data);
                            if (data) {
                                wstream.write(data);
                            }
                        });
                        */

                    }
                },
                onDrain: function () {
                    console.log('Done Writing');
                    wstream.end();
                    launchTrainer(currentKeyword);
                }
            });
            c.queue(urlList);
        });
    });
}


currentKeyword = argv['main-keyword'];
selectedRnn = argv['rnn'];
test = argv['test'];
keyWordList = argv['_'];
console.log('\n');
console.log('Entered Main Keyword: ' +  currentKeyword);
console.log('Test Mode: ' + test);
console.log('Keyword List: ');
console.log(keyWordList);

if (!argv['rnn']) {
    selectedRnn = 'char-rnn';
}

console.log('Selected RNN ' + selectedRnn);
if (selectedRnn === 'char-rnn') {
    config.selectedRnn = config.charRnn;
}  else {
    config.selectedRnn = config.wordRnn;
}
rnnDirectory =  config.selectedRnn;
console.log ('Selected Rnn Directory ' + rnnDirectory);

console.log('\n');
console.log('****** -------- STARTING --------- *******');

if (test) {
    googlePages = 1;
    rnnSize = 128;
    layers = 1;
    google.resultsPerPage = 10;
    google.timeOutValue = 1000;
    google.timeOutRange = 2000;
}

function handleInternal(defer,currentKeyword) {
    if(globalInternalLinksCounter < globalLinksToParseInternal.length){
        console.log('Looping...');
        //console.log(globalLinksToParseInternal);
        //console.log(globalInternalLinksCounter);
        if (test && globalInternalLinksCounter === 2) {
            console.log('Count is 3');
            //globalInternalLinksCounter = globalLinksToParseInternal.length;
            return defer.resolve();
        } else {
            console.log("current Site");
            console.log(globalLinksToParseInternal[globalInternalLinksCounter]);
            internal.getInternal(currentKeyword,globalLinksToParseInternal[globalInternalLinksCounter]).then(function(resultList){
                console.log('Response in Loop');
                //console.log(resultList);
                globalInternalLinks = globalInternalLinks.concat(resultList);
                handleInternal(defer,currentKeyword);
            });
        }
        globalInternalLinksCounter++;
    } else {
        return defer.resolve();
    }
}

function superviseHandleInternal(currentKeyword) {
    var defer = q.defer();
    handleInternal(defer,currentKeyword);
    return defer.promise;
}

function removeDuplicates(arr) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        obj[arr[i]] = true;
    }
    arr = [];
    for (var key in obj) {
        arr.push(key);
    }
    return arr;
}

function start(currentKeyword) {
    /***** ENTRY POINT *****/

    nextCounter = 0;
    google(currentKeyword, function (err, next, links) {

        console.log("\n\n STARTING SEARCH: " + currentKeyword);

        if (err) console.error(err);

        console.log("Links returned: " + links.length);
        for (var i = 0; i < links.length; ++i) {
            if (links[i].link) {
                urlList.push(links[i].link);
                globalLinksToParseInternal.push(url.parse(links[i].link).hostname)
            }
        }

        console.log(nextCounter);
        console.log(googlePages);
        if (nextCounter < googlePages) {
            nextCounter += 1;
            if (next) {
                next()
            }
        } else {
            console.log(urlList);
            console.log('\n******** STARTING INTERNAL *******');
            globalLinksToParseInternal = removeDuplicates(globalLinksToParseInternal);

            superviseHandleInternal(currentKeyword).then(function(){
                console.log('\n******** INTERNAL DONE *******');
                console.log('Global Internal Links');
                urlList = globalInternalLinks.concat(urlList);

                console.log('\n******* FINAL URL LIST *********');
                console.log(urlList);

                // Reset Global Variables
                globalInternalLinksCounter = 0;
                globalLinksToParseInternal = [];
                globalInternalLinks = [];
                console.log('******** START CRAWL *******');
                newCrawler(currentKeyword,urlList);
            });
        }
    });
}


//************* SET THE MASTER BLOG KEYWORD ***************
masterKeyword = currentKeyword;

fsExtra.emptyDir("/home/ubuntu/server/www/", function (err) {
    if (!err) {console.log('Successfully Emptied www directory at beginning!')} else {
        console.log(err);
    }
});


start(currentKeyword);

/**
} else {
    // Test options
    newestFile = getNewestFile(rnnDirectory+'cv');
    console.log(newestFile);
    sampleData();
}
**/

