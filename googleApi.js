http = require('http');
util = require('util');
q = require('q');
var request = require('request');

function getInternalLinks(keyword, site) {
    var defer = q.defer(),
        encodedKeyword = encodeURIComponent('site:' + site + ' '+ keyword),
        resultList = [],
        i = 0,
        requestStr = "http://user:" + encodeURIComponent("insertApiKey") +
            "@api.datamarket.azure.com/Bing/Search/Web?$format=json&Query='"+encodedKeyword+"'" +
            "&$top=15";
    http = request(requestStr,  function(err, resp, body) {
        var a = JSON.parse(body),
        siteList = a.d.results.length;
        for (; i < siteList; i++) {
            resultList.push(a.d.results[i].Url);
        }
        return defer.resolve(resultList);
    });
    return defer.promise;
}

module.exports = {
  getInternal: function (keyword, site) {
      return getInternalLinks(keyword, site);
  }
};