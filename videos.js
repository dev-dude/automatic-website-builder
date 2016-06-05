/**
 * Created by david.bailey on 1/16/16.
 * Copyright David Bailey 1/16/16
 */


var cheerio = require('cheerio'),
$ = cheerio.load(''),
q = require('q'),
fs = require('fs'),
request = require('request'),
videoIds = [],
youtubedl = require('youtube-dl'),
downloadVideoCount = 4,
downloadVideoFileNames = [];

var makeVideoCountArray = function(length) {
    arr = [];
    for (i = 0; i < length; i++) {
        arr.push(i);
    }
    return arr;
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

var downloadVideos = function(id) {
    console.log(id);
    var defer = q.defer(),
      video = youtubedl('http://www.youtube.com/watch?v='+id,
      ['--format=18'],
      { cwd: '/home/ubuntu/tmp/' });
    // Will be called when the download starts.

    video.on('info', function(info) {
      console.log('Download started');
      console.log('filename: ' + info.filename);
      console.log('size: ' + info.size);
      video.pipe(fs.createWriteStream('/home/ubuntu/tmp/videos/' + info.filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()));
      downloadVideoFileNames.push(info.filename.replace(/[^a-z0-9]/gi, '_').toLowerCase());
    });

    video.on('end', function() {
        defer.resolve();
        console.log('finished downloading!');
    });
    return defer.promise;
};

var makeVideoRequests = function(keyword,downloadVideo) {
    var defer = q.defer(),
    url = 'https://www.youtube.com/results?search_query='+encodeURIComponent(keyword);
    if (downloadVideo) {
        url = 'https://www.youtube.com/results?search_query='+encodeURIComponent(keyword) + '&filters=creativecommons%2C+short';
    }
    request.get({
        url: url
    }, function(err, resp, html) {
        $ = cheerio.load(html);
        var videos = $('.item-section').find('.yt-uix-button-size-small');
        var videoPosition = shuffleArray(makeVideoCountArray(videos.length));
        console.log('Getting ' + videos.length + ' Videos');
        for(var i = 0; i < downloadVideoCount; i++) {
            var videoIndex = videos[videoPosition[i]];
            if (downloadVideo) {
                console.log('download video index');
                videoIndex = videos[i];
            }
            videoIds.push($(videos[videoPosition[i]]).data('video-ids'));
        }
        return defer.resolve(videoIds);
    });
    return defer.promise;
};

var processVideos = function(downloadVideo,test) {
    if (test) {
        console.log("***** VIDEO TEST ***** DOWNLOADING 2 VIDEOS");
        downloadVideoCount = 2;
    }
    var promises = [];
    var videoDownloads = [];
    var defer = q.defer();
    downloadVideoFileNames = [];
    console.log('Downloading Videos');
    for (var y = 0; y < downloadVideoCount; y++) {
        promises.push(downloadVideos(videoIds[y]));
        videoDownloads.push(videoIds[y]);
    }
    // Download all the videos
    console.log('ACTIVE VIDEO PROMISES');
    console.log(promises.length);
    console.log(promises);
    q.all(promises).then(function(){
        console.log('Q ALL Done');
        console.log(downloadVideoFileNames);
        return defer.resolve(downloadVideoFileNames);
    });
    return defer.promise;
};

var getVideos = function(keyword,test) {
    var defer = q.defer();
    console.log('Get Video Function');
    videoIds = [];
    downloadVideoFileNames = [];
    makeVideoRequests(keyword,false).then(function(videoIds){
        console.log('1 step Get Ids');
        console.log(videoIds);
        makeVideoRequests(keyword,true).then(function(downloadVideoIds) {
            console.log('2 step get Download Ids');
            console.log(downloadVideoIds);
            processVideos(downloadVideoIds,test).then(function(downloadVideoFileNames){
                console.log('3 step get Process Videos');
                console.log(downloadVideoFileNames);
                console.log(videoIds);
                return defer.resolve({ids:videoIds,downloadVideos:downloadVideoFileNames});
            })
        });
    });
    return defer.promise;
};

module.exports = getVideos;
//getVideos('free antivirus')
