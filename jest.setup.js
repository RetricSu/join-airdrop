const crypto = require("crypto");
const fetch = require("cross-fetch");
const { ReadableStream } = require("web-streams-polyfill");

if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

global.fetch = fetch;
global.ReadableStream = ReadableStream;
