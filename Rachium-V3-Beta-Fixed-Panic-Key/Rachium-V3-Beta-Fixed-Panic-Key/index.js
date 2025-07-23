const http = require('http');
const https = require('https');
const fs = require('fs');
const axios = require('axios'); // Added for axios

// CONFIGURATION
const prefix = '/web';  // Set your prefix here
const localAddresses = [
  '37.235.49.0',   // Iceland
  '104.16.0.0',    // North America
  '179.51.0.0',    // South America
  '45.85.0.0',     // Europe
  '51.68.0.0',     // UK
  '103.145.0.0',   // Asia
  '178.248.233.0', // Russia
  '103.152.0.0'    // Oceania
];  // Set your local addresses here
const blockedHostnames = ["https://sevenworks.eu.org/bad-site"];  // Set your blocked hostnames here
const ssl = false;  // Set SSL configuration here
const port = 6969;  // Set the desired port
const index_file = 'index.html'; // Set index file shown by the browser
// END OF CONFIGURATION

// Initialize proxy without binding to specific IPs
const proxy = new (require('./lib/index'))(prefix, {
  blacklist: blockedHostnames,
  headers: {
    'X-Forwarded-For': localAddresses[0], // Use Iceland IP as forwarded IP
    'Via': '1.1 proxy'
  }
});

const atob = str => Buffer.from(str, 'base64').toString('utf-8');

const app = async (req, res) => { // Changed to async
  if (req.url.startsWith(prefix)) {
    proxy.http(req, res);
    return;
  }

  if (req.url.startsWith('/change-location')) {
    try {
      const location = req.url.split('loc=')[1];
      const locationIndex = {
        'ic': 0, // Iceland
        'na': 1, // North America
        'sa': 2, // South America
        'eu': 3, // Europe
        'uk': 4, // United Kingdom
        'as': 5, // Asia
        'ru': 6, // Russia
        'oc': 7  // Oceania
      };

      if (locationIndex[location] === undefined) {
        throw new Error('Invalid location');
      }

      proxy.config.localAddress = [localAddresses[locationIndex[location]]];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        name: location.toUpperCase()
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invalid location selected'
      }));
    }
    return;
  }

  if (req.url === '/cloaker.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync('./cloaker.html', 'utf-8'));
    return;
  }

  if (req.url === '/panic.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync('./panic.html', 'utf-8'));
    return;
  }

  req.pathname = req.url.split('#')[0].split('?')[0];
  req.query = {};
  req.url
    .split('#')[0]
    .split('?')
    .slice(1)
    .join('?')
    .split('&')
    .forEach(query => (req.query[query.split('=')[0]] = query.split('=').slice(1).join('=')));

  if (req.query.url && (req.pathname == '/prox' || req.pathname == '/prox/' || req.pathname == '/session' || req.pathname == '/session/')) {
    var url = atob(req.query.url);

    // Enhanced URL detection with common TLDs
    const tlds = /\.(com|org|edu|gov|net|io|co|me|app|dev|xyz|info|biz|tech|online|site|web)$/i;
    const isUrl = tlds.test(url) ||
                  url.startsWith('http://') ||
                  url.startsWith('https://') ||
                  url.startsWith('//');

    if (!isUrl) {
      // Treat as search query using Google Custom Search API
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_CSE_ID;
      const searchQuery = encodeURIComponent(url);
      url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${searchQuery}`;

      try {
        const response = await axios.get(url);
        //Handle potential errors in the response
        if(response.data.items && response.data.items.length > 0){
          // Format and display search results - using first result for simplicity.  Could be improved.
          url = response.data.items[0].link;
        } else {
          //Fallback to standard search if no results or error
          url = 'https://www.google.com/search?q=' + searchQuery;
        }
      } catch (error) {
        //Fallback to standard search if API call fails
        console.error("Google Custom Search API Error:", error);
        url = 'https://www.google.com/search?q=' + searchQuery;
      }
    } else if (url.startsWith('https://') || url.startsWith('http://')) {
      url = url;
    } else if (url.startsWith('//')) {
      url = 'http:' + url;
    } else {
      url = 'http://' + url;
    }

    res.writeHead(301, { location: prefix + proxy.proxifyRequestURL(url) });
    res.end('');
    return;
  }

  const publicPath = __dirname + '/public' + req.pathname;

  const error = () => {
    res.statusCode = 404;
    res.end(fs.readFileSync(__dirname + '/lib/error.html', 'utf-8').replace('%ERR%', `Cannot ${req.method} ${req.pathname}`));
  };

  fs.lstat(publicPath, (err, stats) => {
    if (err) return error();

    if (stats.isDirectory()) {
      fs.existsSync(publicPath + index_file) ? fs.createReadStream(publicPath + index_file).pipe(res) : error();
    } else if (stats.isFile()) {
      !publicPath.endsWith('/') ? fs.createReadStream(publicPath).pipe(res) : error();
    } else {
      error();
    }
  });
};

const server = ssl
  ? https.createServer({ key: fs.readFileSync('./ssl/default.key'), cert: fs.readFileSync('./ssl/default.crt') }, app)
  : http.createServer(app);

proxy.ws(server);
server.listen(process.env.PORT || port, () => console.log(`${ssl ? 'https://' : 'http://'}0.0.0.0:${port}`));