/* eslint-disable */
/**
 * Converts PublicKeyCredential into serialised JSON
 * @param  {Object} pubKeyCred
 * @return {Object}            - JSON encoded publicKeyCredential
 */

const base64url = require('./base64url-arraybuffer.js');
const arrayBufferToHex = require('array-buffer-to-hex')
const {padLeft} = require('web3-utils')


var publicKeyCredentialToJSON = (pubKeyCred) => {
  if (pubKeyCred instanceof Array) {
    let arr = [];
    for (let i of pubKeyCred) arr.push(publicKeyCredentialToJSON(i));

    return arr;
  }

  if (pubKeyCred instanceof ArrayBuffer) {
    return base64url.encode(pubKeyCred);
  }

  if (pubKeyCred instanceof Object) {
    let obj = {};

    for (let key in pubKeyCred) {
      obj[key] = publicKeyCredentialToJSON(pubKeyCred[key]);
    }

    return obj;
  }

  return pubKeyCred;
};

/**
 * Generate secure random buffer
 * @param  {Number} len - Length of the buffer (default 32 bytes)
 * @return {Uint8Array} - random string
 */
var generateRandomBuffer = (len) => {
  len = len || 32;

  let randomBuffer = new Uint8Array(len);
  window.crypto.getRandomValues(randomBuffer);

  return randomBuffer;
};

/**
 * Decodes arrayBuffer required fields.
 */
var preformatMakeCredReq = (makeCredReq) => {
  makeCredReq.challenge = base64url.decode(makeCredReq.challenge);
  makeCredReq.user.id = base64url.decode(makeCredReq.user.id);

  return makeCredReq;
};

/**
 * Decodes arrayBuffer required fields.
 */
var preformatGetAssertReq = (getAssert) => {
  getAssert.challenge = base64url.decode(getAssert.challenge);

  for (let allowCred of getAssert.allowCredentials) {
    allowCred.id = base64url.decode(allowCred.id);
  }

  return getAssert;
};


var extractRSFromSignature = (signature) => {
  const rlen = signature[3]
  const slen = signature[3 + rlen + 2]
  console.log('r,s len', rlen, slen)

  const rHex = padLeft(signature.slice(4, 4 + rlen).toString('hex'), 64, '0')
  const sHex = padLeft(signature.slice(3 + rlen + 2 + 1).toString('hex'), 64, '0')

  console.log('r', rHex)
  console.log('s', sHex)
  const r = Buffer.from(rHex, 'hex')
  const s = Buffer.from(sHex, 'hex')

  return { r: r.slice(-32), s: s.slice(-32) }
}

var parseGetAssertAuthData = (buffer) => {
  let rpIdHash      = buffer.slice(0, 32);          buffer = buffer.slice(32);
  let flagsBuf      = buffer.slice(0, 1);           buffer = buffer.slice(1);
  let flags         = flagsBuf[0];
  let counterBuf    = buffer.slice(0, 4);           buffer = buffer.slice(4);
  // let counter       = counterBuf.readUInt32BE(0);

  return {rpIdHash, flagsBuf, flags, counterBuf}
}

var convertPubkeyToHex = (base64PubKey)=>{
  let publicKeyBuffer = base64url.decode(base64PubKey)
  return '0x'+arrayBufferToHex(publicKeyBuffer).slice(2)
}

ArrayBuffer.prototype.toBuffer = function () {
  const hex = arrayBufferToHex(this)
  return Buffer.from(hex.replace('0x', ''), 'hex')
}



module.exports = {
  publicKeyCredentialToJSON,
  generateRandomBuffer,
  preformatMakeCredReq,
  preformatGetAssertReq,
  parseGetAssertAuthData,
  extractRSFromSignature,
  convertPubkeyToHex,
};
