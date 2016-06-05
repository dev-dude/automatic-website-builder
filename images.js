/**
 * Created by david.bailey on 1/16/16.
 */

var tmpDirectory = '/home/ubuntu/tmp/',
cheerio = require('cheerio'),
$ = cheerio.load(''),
imageAssetList = [],
q = require('q'),
getImageCount = Math.floor(Math.random() * 5) + 15,
fs = require('fs'),
request = require('request'),
http = require('http');
https = require('https');


var makeImageCountArray = function(length) {
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

var makeImageRequest = function($,index,keyword,link) {
    var randomNumber,
        link,
        file,
        request,
        imagesLength,
        imageArr,
        defer = q.defer();

      // Check if Jpeg
      console.log('Image link: ' + link);



	if(link.substring(0,5)=="http:"){

		request = http.get(link, function(response) {
		file = fs.createWriteStream(tmpDirectory + keyword + '-' + index + '.jpg');
		imageAssetList.push(keyword + '-' + index + '.jpg');
		response.pipe(file);

		file.on('finish', function(){
			console.log('Got Image: '+ file);
			return defer.resolve();
		});

		}).on('error', function(e) {
			console.log("Got error: " + e.message);
			return defer.resolve();
		});
	}else{
		return defer.resolve();
}
	return defer.promise;
};

var getImages = function(keyword,path) {
    var encodedKeyword = encodeURIComponent(keyword);
    var promises = [],
      defer = q.defer(),
      url =  "http://user:" + encodeURIComponent("insertAPIKey") + "@api.datamarket.azure.com/Bing/Search/Image?$format=json&Query='"+encodedKeyword+"'"


              // Image-specific request fields (optional)
          + "&$top=15";

    console.log("Bing image search url: " + url)

    request.get({
    url: url
    }, function(err, resp, html){

        var a = JSON.parse(html);

        imagesLength = a.d.results.length;
        imageArr = shuffleArray(makeImageCountArray(imagesLength));
        console.log('Getting ' + getImageCount + ' Images');
        for (i = 0; i < getImageCount; i++){

            if(a.d.results[i] === undefined){
                continue;
            }
            promises.push(makeImageRequest($,i,keyword,a.d.results[i].MediaUrl));
        }

        console.log("Done getting images")
        console.log(promises);
        q.all(promises).then(function(data){
              console.log('Images resolved');
              var imageAssetListCopy = imageAssetList;
              imageAssetList = [];
              console.log(imageAssetListCopy);
              return defer.resolve(imageAssetListCopy);
        });
    });
    return defer.promise;
};

module.exports = getImages;
