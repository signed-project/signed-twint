const fsp = require("fs/promises");
const post = require("./models/post");
const { publicQuery, protectedQuery } = require("./utils/dataBaseQuery/query");
const axios = require("axios");
const { host, userApi, credentials, postApi, publicApi, inboxApi } = require("./config");
const { getSystemErrorMap } = require("util");
const { getSignatures, getHash, getRegisterUserData, getDataSrp } = require("./libs/signature");

const userName = 'ParikPatelCFA';
const folderPath = './indexesTest';

const readJSONLines = async ({ filePath }) => {
    const data = await fsp.readFile(filePath, { encoding: 'utf8' });
    const lines = data.trim().split('\n')
    return lines.map(JSON.parse)
}

postsById = {}
usersByUserName = {}
sourcesByPublicName = {}

const buildUser = ({userName}) => {
    const date = new Date().getTime();
    const userBitcoinData = getRegisterUserData({ password: credentials.password, wifString: '' });
    const srpData = getDataSrp({ userName, password: credentials.password });
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
        userName: userName,
        encryptedWif: userBitcoinData.encryptedWif,
        source: {
            address: userBitcoinData.address,
            updatedAt: date,
            avatar: {
                contentType: "",
                hash: "",
            },
            publicName: userName,
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
const registerUser = async ({user}) => {

    const inputData = {
        salt: user.salt,
        verifier: user.verifier,
        userName: user.userName,
        address: user.source.address,
        encryptedWif: user.encryptedWif,
        source: user.source,
    };
    try {
        const { data } = await publicQuery().post(`${userApi.REGISTER}`, inputData);
        if (data.accessToken) {
            console.log('accessToken', data.accessToken);
            return { ...user, token: data.accessToken };
        }
    } catch (e) {
        console.warn("registerUser failed", e);
    }
}

const getUser = async ({userName}) => {
    console.log('getUser ' + userName)
    userName = userName.toLowerCase()
    if(userName in usersByUserName) return usersByUserName[userName]
    try {
        console.log('Fetching user ' + h.index)
        const { data } = await publicQuery().post(`${userApi.GET_USER}`, { userName });
        usersByUserName[userName] = data
        console.log('Got the user')
        if(userName in sourcesByPublicName) {
            source = sourcesByPublicName[userName]
            console.log('source: ', source)
            await Promise.allSettled(
                source.hosts.map(async (h) => {
                    try {
                        console.log('Fetching index ' + h.index)
                        const res = await axios.get(h.index);
                        if (res?.data?.index) {
                            console.log('Got ' + res.data.index.recentPosts.length + ' items');
                            res.data.index.recentPosts.forEach((p) => {
                                postsById[p.id] = p
                            })
                            if('archives' in res.data.index) {
                                await Promise.allSettled(
                                    res.data.index.archives.map(async (a) => {
                                        url = h.assets + '/' + a.hash.substring(0,2) + '/' + a.hash.substring(2,4) + '/' + a.hash.substring(4) + ".json";
                                        console.log('Fetching achive ' + url)
                                        const res = await axios.get(url);
                                        console.log('Got ' + res.data.posts.length + ' items');
                                        res.data.posts.forEach((p) => {
                                            postsById[p.id] = p
                                        })
                                    })
                                )
                            }
                        }
                        
                    } catch (e) {
                        console.log('[getSubscribedIndex]', e);
                    }
                })
            )
        }
        return(data)
    } catch (e) {
        console.warn('Could not fetch the user ' + userName)
    }
    console.log('Creating user ' + userName)
    let user = buildUser({userName})
    user = registerUser({user})
    usersByUserName[userName] = user
    return user
}

const getPost = async ({userName, twitterId}) => {
    user = await getUser({userName})

    // check if post is already in cache
    if('twitter_'+twitterId in postsById) return postsById['twitter_'+twitterId]

    return null
}

const getSourcesByPublicName = async () => {
    const url = `${host.API_HOST}${userApi.SUBSCRIBED}`;
    console.log('Getting ' + url);
    // const { data } = await publicQuery().get(url);
    console.log('From disk for faster access')
    const data = JSON.parse(await fsp.readFile('subscribed', { encoding: 'utf8' }));

    res = {}
    data.forEach((s) => {
        res[s.publicName] = s
    });
    return res;
}

(async () => {
    sourcesByPublicName = await getSourcesByPublicName()
    // Phase 1:
    // Take the provided user
    // Read his posts from JSON
    filePath = `${folderPath}/user_${userName}.json`
    tweets = await readJSONLines({ filePath });
    console.log("Read " + tweets.length + " tweets of " + userName)

    ownTweets = tweets.filter(tweet => tweet.reply_to.length === 0);
    console.log("Of which " + ownTweets.length + " are own tweets rather than replies")
    // Create all his stand-alone posts that are not on the server yet - in parallel
    ownTweets = ownTweets.slice(0,1)
    for (const tweet of ownTweets) {
        twitterId = tweet.id
        const post = await getPost({userName, twitterId})
        if(!post) {
            console.log('Creating new post')
        }
    }

    
    // Phase 2:
    // Read replies from JSON and build threads
    // Create all replies that are not on the server yet - in parallel

    // Use the caches
    // userCache - caches information about users and sources
    // - getSource(userName)
    // - sign(post, userName)
    // postCache - caches information about posts on the server
    // - getPost(userName, createdAt, text)
    // - addPost(post)
    
    // SSD
    // Do not sort anything

    console.log('All done');
})();