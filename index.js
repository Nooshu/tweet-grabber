#!/usr/bin/env node

// require some helpers
const util = require('util');
const fs = require('fs');
const path = require('path');
const exec = util.promisify(require('child_process').exec);
const puppeteer = require('puppeteer');

// store the argument the user passes in
const userarg = process.argv[2];

// set some default settings
const uncompressedTweetsDir = 'uncompressed_tweets';
const compressedTweetsDir = 'compressed_tweets';
const compressedFileSuffix = '_compressed';
const jpegCompression = 90;
const cleanCompressedDirectory = false;

// clean the compressed tweets directory on startup
if(cleanCompressedDirectory){
  fs.readdir(`./${compressedTweetsDir}`, (err, files) => {
    if (err) {
      console.log(err);
    }

    files.forEach(file => {
      const fileDir = path.join(`./${compressedTweetsDir}`, file);

      if(file !== '.gitkeep') {
        fs.unlinkSync(fileDir);
      }
    });
  });
}

// has the user passed in a file?
if(userarg && fs.existsSync(userarg) && fs.lstatSync(userarg).isFile()){
  // loop over the file line by line (sync)
  fs.readFileSync(userarg).toString().split("\n").forEach(function(line, index, arr) {
    if (index === arr.length - 1 && line === "") { return; }
    tweetGrabber(line.trim());
  });
} else if(userarg.includes(',')) { // assume multiple URL's have been passed
  // split the string and remove and white space
  let urlArray = userarg.split(",").map(url => url.trim());
  // loop over the URL's
  urlArray.forEach(function(url,index){
    tweetGrabber(url);
  });
} else if(userarg) { // assuming a single URL has been passed
  tweetGrabber(userarg);
} else { // nothing passed, throw an error message
  throw "Please provide a valid Twitter URLs or text file as the first argument.";
}

/**
 * Puppeteer function used to capture an image of the tweet and extract the text from it too
 * @param {string} url tweet to be screenshotted
 */
async function tweetGrabber(url) {
  // check see if this URL is from Twitter
  if(!url.includes('twitter.com')){
    console.error("This URL isn't from Twitter");
    return;
  }

  // split tweet url down into an array
  let urlArray = url.match(/^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/);
  // store the tweet ID for file naming
  let id = urlArray[3];

  // fire up browser and open a new page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // go to the selected tweet page, wait until the network is idle before proceeding
  // could DCL be used here?
  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  // store the page title
  const pageTitle = await page.title();

  /**
   * This is very flakey. Examining the page title to check is tweet has been deleted
   * since we need to wait on Twitters JS hydration. Default title is "Tweet / Twitter"
   * when not hydrated, and the <head> is quick to parse. Open to better ways to detect this!
   */
  if(pageTitle === "Tweet / Twitter") {
    console.error(`Tweet: ${id} looks to have been deleted.`);
    // write the error to a file with the same ID
    fs.writeFile(`${compressedTweetsDir}/${id}.txt`, `There was an error with this tweet (${id}). Has it been deleted?\r\n\r\n${url}`, function (err) {
      if (err) return console.log(err);
    });
  } else {
    // tweet hasn't been deleted so wait for the tweet to exist in the DOM
    await page.waitForSelector('article[role="article"]');
    // select the tweet in the page
    const tweet = await page.$('article[role="article"]');
    // select the tweets main body text
    const tweetBodyText = await page.$('article[role="article"] div[lang="en"]');
    // select the tweets date
    const tweetDateText = await page.$('article[role="article"] div[dir="auto"] > a[role="link"] > span');

    // we need to manipulate the page as by default the login / sticky header are included in the screenshot
    await page.evaluate(() => {
      // target the sticky header
      let topElement = document.querySelector('div[data-testid="titleContainer"]');
      // target the sign in and cookie banner
      let bottomElement = document.querySelector('#layers > div');

      // remove these elements as we don't want them in the screenshot
      topElement.parentNode.removeChild(topElement);
      bottomElement.parentNode.removeChild(bottomElement);
    });

    // extract the body and date text
    const bodyText = await page.evaluate(tweetBodyText => tweetBodyText.textContent, tweetBodyText);
    const dateText = await page.evaluate(tweetDateText => tweetDateText.textContent, tweetDateText);

    // write the tweet text and date to a txt file with the same ID as the screenshot
    fs.writeFile(`${compressedTweetsDir}/${id}.txt`, `${bodyText} - ${dateText}\r\n\r\n${url}`, function (err) {
      if (err) return console.log(err);
    });

    // screenshot the tweet, save to uncompressed folder
    await tweet.screenshot({path: `${uncompressedTweetsDir}/${id}.png`});
    // run the uncompressed image through the Squoosh CLI tool to convert it to a JPEG
    await exec(`squoosh-cli -d ${compressedTweetsDir} --mozjpeg ${jpegCompression} -s ${compressedFileSuffix} ${uncompressedTweetsDir}/${id}.png`);
  }

  // close the browser
  await browser.close();
};
