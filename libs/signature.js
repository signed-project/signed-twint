const stringify = require('fast-json-stable-stringify');
// import sortKeys from 'sort-keys';
const sortKeys = require('sort-object-keys')
const { nanoid } = require('nanoid')
const CryptoJS = require("crypto-js");
const bs58 = require('bs58')
const bip38 = require('bip38')
const wif = require('wif')
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');
const srp = require('secure-remote-password/client')


/**
 * @tutorial way to get wif and atc 
 * 
 *  const keyPairRundom = bitcoin.ECPair.makeRandom();
//   const keyPairRun = bitcoin.ECPair.fromPrivateKey();
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPairRundom.publicKey });
  console.log('keyPair__________________________________________________________', address);
  const privateKeyBuffer = Buffer.from(keyPairRundom.privateKey)
  const privateKeyRun = privateKeyBuffer.toString('hex')
  var wif = keyPairRundom.toWIF();

   TODO: to clean component!!!
   var keyPair = bitcoin.ECPair.fromWIF('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1');
  var keyPair = bitcoin.ECPair.fromWIF('Kx7DQ8DtiTaEYut5f85jAG3bhPNJUB6neER3yQaVgueeLDT7Ax8e');
  var privateKey = keyPair.privateKey;
  var message = 'This is an example of a signed message.';

  var signature = bitcoinMessage.sign(message, privateKey, keyPair.compressed);

   const bytes = Buffer.from(signature, 'hex')
   const code = bs58.encode(bytes);

   const bytesRecode = bs58.decode(address)
   const hex = bytesRecode.toString('hex')
   1F3sAm6ZtwLAUnj7d38pGFxtP3RVEvtsbV
  var addressTest = '19FRhaywUUpvMxUMSxgpTvc44Bj9VFd3BT';
  const isValid = bitcoinMessage.verify(message, addressTest, signature.toString('base64'));
  console.log('verify____!!!!!!!!!!!!!!!!', bitcoinMessage.verify(message, addressTest, 'HyevO7YXuJVEmBp+WqhU1uQgH8Y8G4A7RlYr413wjFs6Em8BVq6ypTonydwcQMjm3ysKhWynFGkpxUsRLY+TbgA='));


    console.log(crypto.SHA256("password").toString());
    const crypto = sha256('nonce' + 'message');

    console.log('CryptoJS_______', ciphertext.toString());


    var privateKey = new bitcore.PrivateKey('L23PpjkBQqpAF4vbMHNfTZAb3KFPBSawQ7KinFTzz7dxq6TZX8UA');
    var message = new Message('This is an example of a signed message.');

    var signature = message.sign(privateKey);
    console.log('signature', signature); 

 */

exports.getRegisterUserData = ({ password }) => {
    const keyPair = bitcoin.ECPair.makeRandom();
    const wifBeforeEncrypt = keyPair.toWIF();
    const decoded = wif.decode(wifBeforeEncrypt);
    const encryptedWif = bip38.encrypt(decoded.privateKey, decoded.compressed, password)
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

    return {
        encryptedWif,
        wif: wifBeforeEncrypt,
        address: address,
    };
}

exports.isWifFormat = ({ wif }) => {
    try {
        const pair = bitcoin.ECPair.fromWIF(wif);
        return !!pair;
    } catch (e) {
        console.warn('[isWifFormat]', e);
        return false;
    }
}

// clean object fubction add to getJsonStringFromObj

const getJsonStringFromObj = ({ objData }) => {
    let jsonData;
    try {
        let objCopy = JSON.parse(JSON.stringify(objData));
        delete objCopy.hash;
        delete objCopy.signatures;
        objCopy = sortKeys(objCopy);
        jsonData = stringify(objCopy);
    } catch (e) {
        console.warn('[signature][getJsonStringFromObj]', e);
        jsonData = ''
    }
    return jsonData;
}

exports.getSignatures = ({ data, wif }) => {
    let signatureString;
    try {
        const dataJson = getJsonStringFromObj({ objData: data });
        const keyPair = bitcoin.ECPair.fromWIF(wif);
        const privateKey = keyPair.privateKey;
        const signature = bitcoinMessage.sign(dataJson, privateKey, keyPair.compressed);
        signatureString = signature.toString('base64');
    }
    catch (e) {
        console.error('[signature][getSignatures]', e);
        signatureString = ''
    }
    return signatureString;
};

exports.getHash = ({ data }) => {
    const dataJson = getJsonStringFromObj({ objData: data });
    let resHash;
    try {
        const hash = CryptoJS.SHA256(dataJson);
        const hashString = hash.toString(CryptoJS.enc.Hex);
        const bytes = Buffer.from(hashString, 'hex');
        resHash = bs58.encode(bytes);
    } catch (e) {
        console.error('[getHash]', e);
    }
    return resHash;
}

exports.generateId = () => {
    return nanoid();
}

exports.isSignatureValid = ({ data, address }) => {
    const { signatures } = data;
    const jsonString = getJsonStringFromObj({ objData: data });

    let isValid = false, isSignatureArrValid;
    try {
        if (Array.isArray(signatures)) {
            isSignatureArrValid = signatures.map(sign => {
                return bitcoinMessage.verify(jsonString, sign.address, sign.signature);
            })
            if (!isSignatureArrValid.find(sign => sign === false)) {
                isValid = true
            }
        } else {
            isValid = bitcoinMessage.verify(jsonString, address, signatures);
        }
    } catch (e) {
        console.warn("[isSignatureValid]", e);
        isValid = false;
    }

    return isValid;
};





exports.getDataSrp = ({ userName, password }) => {
    const salt = srp.generateSalt();
    const privateKey = srp.derivePrivateKey(salt, userName, password)
    const verifier = srp.deriveVerifier(privateKey);
    return {
        salt,
        verifier
    }
}