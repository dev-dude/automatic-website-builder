/**
 * Created by david.bailey on 1/16/16.
 * Copyright David Bailey 1/16/16
 */

console.log("Builder setup");


var wwwDirectory = '/home/ubuntu/server/www/',
    logDirectory = '/home/ubuntu/logs',
    tmpDirectory = '/home/ubuntu/tmp/',
    config = require("./config.js"),
    getImages = require("./images.js"),
    getVideos = require("./videos.js"),
    repositoryDirectory = '/home/ubuntu/server/nodecrawler/',
    process = require('process'),
    exec = require('child_process').execSync,
    Tokenizer = require('sentence-tokenizer'),
    tokenizer = new Tokenizer('Chuck'),
    fs = require('fs'),
    fsExtra = require('fs-extra'),
    xml2js = require('xml2js'),
    request = require('request'),
    child,
    sampleOutPutFile = config.selectedRnn + 'sample-output.txt',
    //hexoLocation = '/usr/local/lib/node_modules/hexo-cli/bin/',
    hexoLocation = '',
    imageAssetList = [],
    parser = new xml2js.Parser,
    checkGrammarLoopIterator = 0,
    howManyTimes = 10,
    selectedTheme = {},

    //TODO: CLEAR SAMPLE DOCUMENT GLOBAL
    sampleDocumentGlobal = '',
    correctionsListGlobal = [],
    sentenceTokensGlobal,
    themes = [
        {url: 'https://github.com/cgmartin/hexo-theme-bootstrap-blog.git', name: 'bootstrap-blog'},
        {url: 'https://github.com/ptsteadman/hexo-theme-corporate.git', name: 'corporate'},
        /* {url: 'https://github.com/chrisjlee/hexo-theme-zurb-foundation.git', name: 'zurb-foundation'}, */
        /* {url: 'https://github.com/ppoffice/hexo-theme-hueman.git', name: 'hueman'}, */
        /* {url: 'https://github.com/hexojs/hexo-theme-landscape.git', name: 'landscape'}, TODO: //fix because its already downloaded*/
        /*{url: 'https://github.com/ppoffice/hexo-theme-icarus.git', name: 'icarus'},*/
        /* {url: 'https://github.com/wuchong/jacman.git', name: 'jacman'}, */
        /* {url: 'https://github.com/LouisBarranqueiro/hexo-theme-tranquilpeak.git', name: 'tranquilpeak'},
        /*{url: 'https://github.com/hexojs/hexo-theme-light.git', name: 'light'}, //close but chinese needs to be removed*/
        {url: 'https://github.com/tommy351/hexo-theme-phase.git', name: 'phase'}
        /*{url: 'https://github.com/luuman/hexo-theme-spfk.git', name: 'spfk'},*/
        /*{url: 'https://github.com/tangkunyin/hexo-theme-ttstyle.git', name: 'ttstyle'}*/
    ],
    videoIds = [],
    videoDownloadsList = [],
    q = require('q'),
    test = (process.argv[3]) ? true : false;



var makeGrammarRequest = function(sentence) {
    var defer = q.defer();
    var options = {
        method: 'GET',
        url: 'http://service.afterthedeadline.com/checkDocument?data='+encodeURIComponent(sentence)
    };
    request(options, function(err, res, body) {
        parser.parseString(body, function(err, result) {
            return defer.resolve(result);
        });
    });
    return defer.promise;
};

var escapeRegExp = function(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};

var replaceAll = function(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
};

// Check Grammar Loop gets called over and over again
var checkGrammarLoop = function(defer) {
    checkGrammarLoopIterator++;
    if( checkGrammarLoopIterator < howManyTimes ){
        makeGrammarRequest(sentenceTokensGlobal[checkGrammarLoopIterator]).then(function(data) {
            var i = 0;
            if (data && data.hasOwnProperty('results') && data.results && data.results.hasOwnProperty('error')) {
                for (; i < data.results.error.length; i++) {
                    if (data.results.error[i].hasOwnProperty('suggestions')) {
                        console.log(data.results.error[i]);
                        var originalWord = data.results.error[i]['string'][0];
                        var correction = data.results.error[i]['suggestions'][0].option[0];
                        // Make sure original word isn't a proper noun (just checking uppercase);
                        if (originalWord[0] !== originalWord[0].toUpperCase()) {
                            correctionsListGlobal.push({originalWord:originalWord,correction:correction});
                        }
                    }
                }
            }
            checkGrammarLoop(defer);
        });
    } else {
        return defer.resolve();
    }
};

var checkGrammar = function(sentenceTokens) {
    console.log('Check Grammar');
    correctionsListGlobal = [];
    var defer = q.defer();
    howManyTimes = sentenceTokens.length;
    sentenceTokensGlobal = sentenceTokens;
    console.log('Sample Document Global');
    console.log(sampleDocumentGlobal);
    checkGrammarLoop(defer);
    return defer.promise;
};

var makeCorrections = function() {
    var i = 0;
    console.log('*******CorrectionsLIST*******');
    console.log(correctionsListGlobal);
    for (; i < correctionsListGlobal.length;i++){
        sampleDocumentGlobal = replaceAll(sampleDocumentGlobal,correctionsListGlobal[i].originalWord,correctionsListGlobal[i].correction);
    }
};

var tokenizeSentences = function(data) {
    var sentences = data.join("\n\n"),
        defer = q.defer(),
        sentenceTokens;
    console.log('***********SENTENCE TOKENS!*************');
    console.log('here0');
    console.log(sentences);
    tokenizer.setEntry(sentences);
    console.log('here1');
    if (sentences) {
        sentenceTokens = tokenizer.getSentences();
        console.log('here2');
        console.log(sentenceTokens);
        checkGrammar(sentenceTokens).then(function(data){
            console.log('final resolve');
            makeCorrections();
            console.log(data);
            defer.resolve(data);
        });
    } else {
        defer.resolve(sentences);
    }
    return defer.promise;
};

var shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};


var insertIntoFile = function(keyword, masterKeyword, nonFormattedKeyword) {
    console.log('CURRENT KEYWORD FORMAT');
    console.log('MasterKeyword: ' + masterKeyword);
    console.log('NonFormattedKeyword: ' +nonFormattedKeyword);
    console.log('Keyword:' + keyword);
    var desiredFile = wwwDirectory + masterKeyword+'/source/_posts/' + keyword+'.md';
    var data = fs.readFileSync(desiredFile).toString().split("\n\n");
    var title = 'title: '+capitalize(nonFormattedKeyword)+'\n' + '---\n\n ';
    var paragraphLocations;
    var defer = q.defer();
    console.log('TITLE ' + title);
    // remove nvidia jargon
    data.splice(0,1);
    sampleDocumentGlobal = '';
    sampleDocumentGlobal = data.join("\n\n");


    console.log('***********!!!!BEFORE SENTENCE TOKENS!!!*************');
    tokenizeSentences(data).then(function(){
        console.log('&&&&& TOKENIZE SENTENCES GRAMMAR CHECK COMPLETE &&&&&&&');
        // add in title
        data = sampleDocumentGlobal.split("\n\n");
        data.splice(0,0,title);
        console.log('Split Paragraph Length' + data.length);
        console.log(imageAssetList);
        var tags = [];
        for (var i = 0; i < imageAssetList.length; i++) {
            tags.push('{% img_p image '+imageAssetList[i]+' center width:300px; %}');
        }
        console.log('videoIds');
        console.log(videoIds);
        for (var i = 0; i < videoIds.length; i++) {
            tags.push('{% youtube '+videoIds[i]+'%}');
        }
        // console.log(text);
        console.log('videoDownloadsList INSERT');
        console.log(videoDownloadsList);
        for (var i = 0; i < videoDownloadsList.length; i++) {
            tags.push('{% img_p video '+videoDownloadsList[i]+' center width:300px; %}');
        }

        console.log('shuffleArray');
        tags = shuffleArray(tags);

        console.log('tags');
        console.log(tags);
        console.log(data.length);
        console.log(data);
        for (var x = 0; x < data.length; x++) {
            data.splice(x, 0, tags.pop());
        }

        console.log('tags left over');
        console.log(tags.length);
        if (tags.length > 0) {
            for (var y = 0; y < tags.length; y++) {
                data.splice(y, 0, tags.pop());
            }
        }

        var text = data.join("\n\n");
        // console.log(text);

        console.log(text);
        console.log(desiredFile);
        console.log('WRITE FILE');
        fs.writeFile(desiredFile, text, function (err) {
            defer.resolve();
            if (err) return console.log(err);
        });
    });
    return defer.promise;
};

var clearTmpFolder = function() {
  var defer = q.defer();
  console.log('Clear tmp Folder');
  fsExtra.emptyDir('/home/ubuntu/tmp', function (err) {
      if (!err) {console.log('Successfully Emptied tmp directory!')} else {
          console.log(err);
      }
      console.log('Empty tmp directory create video directory');
      fsExtra.mkdirs('/home/ubuntu/tmp/videos');
      return defer.resolve();
  });
  console.log('Empty Tmp End');
  return defer.promise;
};

var capitalize = function(word) {
    return word.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

var editConfigFile = function(masterKeyword, bucket) {
    var defer = q.defer(),
        formattedKeyword = capitalize(masterKeyword.replace(/-/g, ' '));
    console.log('Editing Config File');
    fs.readFile(wwwDirectory + masterKeyword + '/_config.yml', 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        // Replace
        console.log('Edit Config File');
        console.log(bucket);
        console.log(masterKeyword);

        var result = data.replace(/title: Hexo/g, 'title: '+ formattedKeyword);
        if (bucket) {
            result = result.replace(/bucket: remove-this/g, 'bucket: ' + bucket);
            //result = result.replace(/root: \//g, 'root: /' + bucket + '/');
        }
        result = result.replace(/default_category: uncategorized/g, 'default_category: ' + masterKeyword);
        result = result.replace(/full_path: remove-this/g, 'full_path: '+ wwwDirectory + masterKeyword.replace(/ /g, '-'));
        result = result.replace(/theme: landscape/g, 'theme: ' + selectedTheme.name);

        console.log('Write Config File');
        fs.writeFile(wwwDirectory + masterKeyword + '/_config.yml', result, 'utf8', function (err) {
            if (err) return console.log(err);
            console.log('Editing Config File COMPLETE! resolve');
            return defer.resolve();
        });
    });
    return defer.promise;
};

var initBlog = function(masterKeyword) {
    var defer = q.defer();
    var initHexoCommand,
      removeHelloWorld,
      copyConfigCommand,
      mvCommand,
      loadContentCommand,
      newPageCommand;

    // initialize blog
    initHexoCommand = hexoLocation + 'hexo init "' + masterKeyword + '" | tee '+logDirectory+'/website-output.txt';
    console.log(initHexoCommand);
    child = exec(initHexoCommand);

    // overwrite package json
    initHexoCommand = 'cp '+ repositoryDirectory + 'package/package.json ' + wwwDirectory + masterKeyword + ' -f';
    console.log(initHexoCommand);
    child = exec(initHexoCommand);

    process.chdir(wwwDirectory + masterKeyword);

    // install hexo again because current version broken
    initHexoCommand = 'npm install hexo';
    console.log(initHexoCommand);
    child = exec(initHexoCommand);

    // clone random theme
    selectedTheme = themes[Math.floor(Math.random()*themes.length)];
    copyConfigCommand = 'git clone ' + selectedTheme.url + ' themes/' + selectedTheme.name;
    console.log(copyConfigCommand);
    child = exec(copyConfigCommand);

    // copy config file - NEED TO EDIT (TODO)
    copyConfigCommand = 'cp '+repositoryDirectory + '_config.yml ' + wwwDirectory + masterKeyword + ' -f';
    console.log(copyConfigCommand);
    child = exec(copyConfigCommand);

    // Edit config file
    editConfigFile(masterKeyword).then(function(){
        // Install Node Packages
        loadContentCommand = 'npm install | tee ' + logDirectory + '/website-output.txt';
        console.log(loadContentCommand);
        child = exec(loadContentCommand);

        // Install Hexo Deployer Node Packages
        loadContentCommand = 'npm install hexo-deployer-sync-s3 --save';
        console.log(loadContentCommand);
        child = exec(loadContentCommand);

        // Install Hexo Video Tag Plugin Node Packages
        loadContentCommand = 'npm install https://github.com/dev-dude/hexo-tag-imgp --save';
        console.log(loadContentCommand);
        child = exec(loadContentCommand);

        // Install Hexo Video Tag Plugin Node Packages
        loadContentCommand = 'npm install hexo-tag-video --save';
        console.log(loadContentCommand);
        child = exec(loadContentCommand);

        // Install Hexo Video Tag Plugin Node Packages
        loadContentCommand = 'npm install node-bing-api --save';
        console.log(loadContentCommand);
        child = exec(loadContentCommand);

        // Remove Hello World
        ///server/www/free-antivirus/source/_posts
        removeHelloWorld = 'rm ' + wwwDirectory + masterKeyword+'/source/_posts/hello-world.md';
        console.log(removeHelloWorld);
        child = exec(removeHelloWorld);

        // Create Post Master Keyword Post
        newPageCommand = hexoLocation + 'hexo new post "' + masterKeyword + '" | tee ' + logDirectory + '/website-output.txt';
        console.log(newPageCommand);
        child = exec(newPageCommand);

        // 2nd keyword is page name
        mvCommand = 'cp ' + sampleOutPutFile + ' ' +wwwDirectory + masterKeyword+'/source/_posts/'+ masterKeyword+'.md';
        console.log(mvCommand);
        child = exec(mvCommand);

        console.log('Wait 3 seconds HOPE THIS SOLVES THE IO ISSUES');
        setTimeout(function(){
            return defer.resolve();
        },3);
    });
    return defer.promise;
};

var builder = function(keyword,test,nextKeyword) {
    var defer = q.defer();
    var nonFormattedKeyword = keyword;
    imageAssetList = [];
    videoIds = [];
    videoDownloadsList = [];
    keyword = keyword.replace(/ /g, '-');
    clearTmpFolder().then(function(){
        console.log('***getVideos!');
        getVideos(keyword,test).then(function(videos) {
            videoIds = videos.ids;
            videoDownloadsList = videos.downloadVideos;
            getImages(keyword).then(function(data) {
                imageAssetList = data;
                console.log('******* imageAssetList **********');
                console.log(imageAssetList);
                try {
                    var mvCommand,
                        loadContentCommand,
                        copyConfigCommand,
                        coptyTmpDirectory,
                        newPageCommand,
                        leadingWhiteSpaces,
                        masterKeyword,
                        initBlogPromise = defer.promise;

                    process.chdir(wwwDirectory);
                    console.log('Switch to New directory: ' + process.cwd());

                    // ********* !!! THIS IS THE LOOPING CONTROL OBJ DOES NOT RERUN BECAUSE OF FALSE PARAMETER - IT's RE RUN BELOW!!!! ******* //
                    var crawlerObj = nextKeyword(false);
                    masterKeyword = crawlerObj.masterKeyword;
                    masterKeyword = masterKeyword.replace(/ /g, '-');

                    // ************** BUILD THE INITIAL BLOG ********* ONLY DO THIS ONCE **********
                    if (crawlerObj.keywordListCount === 0) {
                        console.log("******** BUILD INITIAL BLOG *******");
                        console.log("KEYWORD LIST COUNT " + crawlerObj.keywordListCount);
                        console.log("BUILDING INITIAL BLOG WITH " + crawlerObj.masterKeyword + " KEYWORD!!!!");
                        initBlogPromise = initBlog(masterKeyword);
                    } else {
                        defer.resolve();

                        // Create Post current keyword
                        newPageCommand = hexoLocation + 'hexo new post "' + keyword + '" | tee ' + logDirectory + '/website-output.txt';
                        console.log(newPageCommand);
                        child = exec(newPageCommand);

                        // 2nd keyword is page name
                        mvCommand = 'cp ' + sampleOutPutFile + ' ' +wwwDirectory + masterKeyword+'/source/_posts/'+ keyword+'.md';
                        console.log(mvCommand);
                        child = exec(mvCommand);

                    }
                    initBlogPromise.then(function(){
                        // ************** *END*  BUILD THE INITIAL BLOG ********* ONLY DO THIS ONCE **********


                        /*
                        // Make video Directory only on initial Build
                        if (crawlerObj.keywordListCount === 0) {
                            console.log('MAKING VIDEOS DIRECTORY '+ wwwDirectory + masterKeyword + '/source/_posts/' + masterKeyword + '/videos/');
                            fsExtra.mkdirs(wwwDirectory + masterKeyword + '/source/_posts/' + masterKeyword + '/videos/');
                        }
                        */

                        // Remove all leading whitespaces
                        leadingWhiteSpaces = "sed 's/^[ ]*//' " + wwwDirectory + masterKeyword+'/source/_posts/'+ keyword+'.md';
                        console.log(leadingWhiteSpaces);
                        child = exec(leadingWhiteSpaces);

                        // Copy Images to Assets Directory
                        coptyTmpDirectory = 'cp '+tmpDirectory +'*.jpg '+ wwwDirectory + masterKeyword+'/source/_posts/' + masterKeyword + '/ -f';
                        console.log(coptyTmpDirectory);
                        child = exec(coptyTmpDirectory);

                        // Copy Videos to Assets Directory
                        coptyTmpDirectory = 'cp '+tmpDirectory + 'videos/* '+ wwwDirectory + masterKeyword+'/source/_posts/' + masterKeyword + '/ -f';
                        console.log(coptyTmpDirectory);
                        child = exec(coptyTmpDirectory);

                        console.log('BEFORE next Keyword');

                        // Insert Images into File
                        insertIntoFile(keyword, masterKeyword, nonFormattedKeyword).then(function() {
                            console.log('Inside Insert File Callback');
                            nextKeyword(true);
                        });
                        // ********* !!! ReRUN PROCESS !!!! ******* //

                    });
                }
                catch (err) {
                    console.log('chdir: ' + err);
                }
            });
        });
    });
};
module.exports = {
    builder: function (keyword, test, nextKeyword) {
        builder(keyword, test, nextKeyword);
    },
    editConfigFile: function (masterKeyword, bucket) {
        return editConfigFile(masterKeyword, bucket)
    }
};

/****** TEST *****/


// Dummy Method for Test belongs in crawler


var nextKeyword = function(reRun) {
    return {keyWordList:[], currentKeyword: 'free antivirus', masterKeyword: 'free antivirus', keywordListCount:0};
};

sampleOutPutFile = '/home/ubuntu/char-rnn/sample-output.txt';
builder('free antivirus',true, nextKeyword);

//var desiredFile = wwwDirectory + 'skateboard-reviews'+'/source/_posts/skateboard-reviews.md';
//var data = fs.readFileSync(desiredFile).toString().split("\n\n");
//sampleDocumentGlobal = data.join("\n\n");
//tokenizeSentences(data).then(function() {
//    console.log('&&&&& TOKENIZE SENTENCES COMPLETE &&&&&&&');
//});

