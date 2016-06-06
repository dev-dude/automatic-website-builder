# Automatic Website Builder (Website AI) Node.js

Example: http://free-antivirus-download-website-assets.s3-website-us-east-1.amazonaws.com/

Uses Char-RNN or Word-RNN to automatically generate websites based on a keyword. First it searches through google for relevant websites, then searches internal links of the websites from bing, builds a massive training set from the website content, puts the training set through Char-RNN, grammar/spell checks itself, finds relevant images, finds relevant videos, downloads Creative Commons videos, builds a website with hexo.js, and finally deploys to S3

Usage: 

1) npm install

2) insert AWS keys and Bing API keys in correct areas. Googleapi.js is actually pointing to bing

3) change /home/ubuntu paths to the relevant paths for your machine

4) Install Char-RNN or Word-RNN on the same machine 

5) node crawler --main-keyword "free antivirus" "free avg download" "free avast download" --test true 

6) remove the test parameter once you have everything working (make sure it's working). Will build a 1 megabyte training set. Need to make it much larger.

7) contact me about a pre-configured machine AWS instance.