# Automatic Website Builder (Website AI)

Example: http://free-antivirus-download-website-assets.s3-website-us-east-1.amazonaws.com/

Uses Char-RNN or Word-RNN to automatically generate websites based on a keyword. It searches through google/bing for relevant content, generates the website content with RNN, grammar checks itself, finds relevant images, finds relevant videos, downloads Creative Commons videos, builds a website with hexo.js, and finally deploys to S3

Usage: 

1) npm install

2) insert AWS keys and Bing API keys in correct areas

3) change /home/ubuntu paths

4) node crawler --main-keyword "free antivirus" "free avg download" "free avast download" --test true 
