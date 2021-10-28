const { getSignatures, getHash, getRegisterUserData, getDataSrp } = require("../libs/signature");
const { credentials, host, publicApi, inboxApi } = require('../config')
const bip38 = require('bip38')
const wif = require('wif')

class User {
    constructor(data) {
        this.data = {
            userName: data.userName ? data.userName : "",
        };
    }

    set setUserData(data) {
        if (!data.encryptedWif) {
            this.data.wif = ''
        };
        const decryptedKey = bip38.decrypt(data?.encryptedWif, credentials.password)
        const wifEncode = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);

        this.data = {
            wif: wifEncode,
            userName: data.userName ? data.userName : '',
            token: data.token ? data.token : '',
            source: data.source ? data.source : {},
        };
    }

    get newDataBaseUser() {
        return {
            wif: this.data.wif,
            userName: this.data.userName,
            source: this.data.source
        }
    }

    get newUser() {
        const date = new Date().getTime();
        const userBitcoinData = getRegisterUserData({ password: credentials.password, wifString: '' });
        const srpData = getDataSrp({ userName: this.data.userName, password: credentials.password });
        const hosts = [
            {
                assets: `${publicApi.API_HOST_ASSETS}`,
                index: `${host.PUBLIC_API_INDEX_HOST}/${userBitcoinData.address}`,
                inbox: `${host.API_HOST}${inboxApi.INBOX}`,
                tag: `${host.PUBLIC_API_TAG_HOST}`,
            }];

        const data = {
            wif: userBitcoinData.wif,
            salt: srpData.salt,
            verifier: srpData.verifier,
            userName: this.data.userName,
            encryptedWif: userBitcoinData.encryptedWif,
            source: {
                address: userBitcoinData.address,
                updatedAt: date,
                publicName: this.data.publicName,
                updatedAt: date,
                avatar: {
                    contentType: "",
                    hash: "",
                },
                publicName: this.data.userName ? this.data.userName : "",
                hosts: hosts,
            }
        };

        const signatures = getSignatures({ data: data.source, wif: data.wif });
        const hash = getHash({ data: data.source });

        return {
            ...data,
            source: {
                ...data.source,
                signatures,
                hash,
            },
        };
    }
};

module.exports = {
    User: User
}