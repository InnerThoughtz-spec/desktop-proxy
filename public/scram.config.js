// Scramjet configuration. Loaded both from index.html (so the page can build
// proxied URLs) and importScripts'd by sw.js (so the SW handler knows where
// its sub-assets live).
//
// We use prefix `/scram/` for *proxied* URLs and serve Scramjet's bundled
// assets from `/scramjet/`. Keeping those two paths distinct lets sw.js
// dispatch by URL prefix without ambiguity (a fetch for `/scramjet/foo.js`
// hits the static mount, a fetch for `/scram/<encoded>` is a proxy hit).
//
// Codecs: `plain` is the upstream default (URI-encoded, human-readable).
// Scramjet also ships `xor`, `base64`, `aes`, `none` if you want to swap.
self.__scramjet$config = {
  prefix: '/scram/',
  codec: self.__scramjet$codecs.plain,
  config: '/scram.config.js',
  bundle: '/scramjet/scramjet.bundle.js',
  worker: '/scramjet/scramjet.worker.js',
  client: '/scramjet/scramjet.client.js',
  codecs: '/scramjet/scramjet.codecs.js',
};
