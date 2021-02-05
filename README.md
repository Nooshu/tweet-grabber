# Tweet Grabber

Simple Node / Puppeteer script to screenshot a tweet (or multiple tweets), recompress the screenshot using [Squoosh CLI](https://github.com/GoogleChromeLabs/squoosh/tree/dev/cli), and safe the tweet text into a separate text file.

## Installation
Clone the repo and use:

```
$ npm install -g @squoosh/cli
$ npm install
```

Squoosh is assumed to be global within the `index.js` file.

## Usage
There are three ways to use the script:

### Single Tweet
Here we pass in a single tweet to be captured:

```
$ node index.js https://twitter.com/TheRealNooshu/status/1334548197881106437
```

### Multiple Tweets (CSV)
Here we pass in multiple tweets as a string with a comma separating them:

```
$ node index.js 'https://twitter.com/TheRealNooshu/status/1334548197881106437, https://twitter.com/TheRealNooshu/status/1357036776074989568'
```

### Multiple Tweets (txt file)
Here the script expects a list of tweets to capture (one per line). See the [example tweets text file](example-tweets.txt):

```
$ node index.js example-tweets.txt
```

## Output
For each of the tweets the original screenshot is captured and saved to the `uncompressed_tweets` folder. A JPEG compressed version, along with the text from the tweet are saved to the `compressed_tweets` folder.

## Options
The script comes with a few options:
* `uncompressedTweetsDir`: Directory to save the original screenshots (default: `uncompressed_tweets`).
* `compressedTweetsDir`: Directory to save the compressed screenshots (default: `compressed_tweets`).
* `compressedFileSuffix`: Add a suffix to the compressed screenshots (default: `_compressed`).
* `jpegCompression`: Level of JPEG compression used for the compressed screenshots (default: `90`).

## License

[MIT](LICENSE)
