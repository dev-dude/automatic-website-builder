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

Copyright (c) 2017 https://github.com/dev-dude/

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
