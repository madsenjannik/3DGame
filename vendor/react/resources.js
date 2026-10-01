// Serve the design runtime's React/Babel from vendor/ instead of unpkg.com.
// support.js reads window.__resources before falling back to the CDN; the files here
// are byte-identical to the CDN builds (they match support.js's SRI hashes).
(function(){
  var base = new URL('./', document.currentScript.src).href;
  window.__resources = Object.assign(window.__resources || {}, {
    'https://unpkg.com/react@18.3.1/umd/react.production.min.js': base + 'react.production.min.js',
    'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': base + 'react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js': base + 'babel.min.js'
  });
})();
