const { default: axiosLib } = require("axios");
const { exec, spawn } = require("child_process");
const execSh = require("exec-sh");
const fsp = require("fs/promises");
const parseJson = require('parse-json');
const { promisify } = require('util');
const { User } = require("./models/user");
const { Post } = require("./models/post");
const { host, userApi, postApi } = require("./config");
const execAsync = promisify(exec);
const sleep = require('util').promisify(setTimeout)
const PromiseBird = require('bluebird');

const currentUserTweetsPath = './currentUserTweets.json';
const directToCurrentUserPath = './directToCurrentUserTweets.json';

const indexes = './indexes'

// const twitterUserName = 's_vakarchuk';
// const twitterUserName = 'fcsm_official';
// const userName = 'Bg53G';
const twitterUserName = 'Bg53G';
// const twitterUserName = 'elonmusk';
// const twitterUserName = '12r8PojfmPOBqdL';
// const twitterUserName = 'bbseva';
//  --images
// const getCurrentUserTweets = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} -o /home/file.json --json`;
const directToUserTweets = `docker run --mount type=bind,source="${__dirname}/directToCurrentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -s "to:@${twitterUserName}"  -o /home/file.json --json`;
const getUserTweetsBashSince = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} --since 2021-12-20 -o /home/file.json --json`;

/* 
Bg53G

[
  'glavekonom',      'tamaraperm2',     'teddybearrussia',
  'valentynavashc2', 'escionepozdno',   'buljons',
  'ievasniedze',     'epjee5dfz9ui1m7', 'zulphiya',
  'snowsides',       'ukusila_larry',   'steepenwolf',
  'horlovkanash',    'sweettwitshit',   'alexx44',
  'pichkurson',      'tern2014',        'zhelezyaka52',
  'zloklychenia',    'beppyline',       '337lae',
  'incernus',        'likhnat',         'tda160877',
  'donbassian',      '_dok_tor_',       'mul_alena',
  'pridenisnik',     'zoltretinyak',    'rl_loffi',
  'krunjav',         'matmmathew',      'uokhmistrova',
  'paisiypchelnik1', 'axlerk',          'sponger86129115',
  'adrianna_black_', 'sklyarov_aa',     'uhjplmz2',
  'fokinlgor',       'john08111972',    'mishabortnovski',
  'sobaka7779',      'anakaa2012',      'nusia_1',
  'avt1604',         'helgaditu',       'jightuse',
  'dzhon_novak',     'arukos',          'volodymyrle',
  'dgamshut1',       'lucky333333',     'highlylikely4',
  '8n5oybq48kwzbu2', 'akopov_k',        'galinatolstykh',
  '067ssa',          'iysakovskaya',    'pavaleks2',
  'vvhale2',         'li_kate_',        'boriz108',
  'jkmwlaxz6lqd8zk', 'nonamelocation'
]

*/


const getCommandCurrentUserTweets = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${userName} -o /home/file.json --json`
}

const getCommandDirectToUser = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/directToCurrentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -s "to:@${userName}"  -o /home/file.json --json`
}

const axios = axiosLib.create({
    baseURL: host.API_HOST,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
})


const updateFile = async ({ filePath, newData }) => {
    try {
        await fsp.writeFile(filePath, newData);
    } catch (e) {
        console.error("[clearFile]", e);
    }
};

const executeCommand = async ({ command }) => {
    let result;
    try {
        result = await execAsync(command);
    }
    catch (e) {
        result = e
        console.warn('[execAsync]', e)
    } finally {
        return result;
    }
};

const readFile = async ({ filePath }) => {
    try {
        let jsonObjectList = await fsp.readFile(filePath, { encoding: 'utf8' });
        jsonObjectList = jsonObjectList.trim();
        const jsonRightScript = "[" + jsonObjectList.replace(/\n/g, ",") + "]";
        return JSON.parse(jsonRightScript);
    } catch (e) {
        console.error("[read Json Main Query (1)][readFile]", e);
    }
}


const generateTweetThreads = ({ onwTweets, tweetsToUser }) => {

    if (!Array.isArray(onwTweets) || !Array.isArray(tweetsToUser)) {
        return []
    }
    const tweetAndCommentsArr = onwTweets.map(tw => {
        const commentsList = tweetsToUser.filter(t => t.conversation_id === tw.conversation_id);
        if (commentsList.length > 0) {
            // console.log('____________________commentsList____________________', commentsList.length);
            // console.log('____________________onwTweets____________________', onwTweets.length);
        }
        // console.log('tw.tweet', tw.tweet);
        return ({
            comments: tweetsToUser.filter(t => t.conversation_id === tw.conversation_id),
            tweet: tw
        });
    })
    return tweetAndCommentsArr;
}


const generateUserMap = ({ tweets, isCurrent = false, userStorageMap }) => {
    const usersMap = new Map();
    if (!Array.isArray(tweets) || tweets.length === 0) {
        return usersMap
    }
    if (isCurrent && !userStorageMap.has(tweets[0].username)) {
        usersMap.set(tweets[0].username, {
            user_id: tweets[0].user_id,
            username: tweets[0].username,
            name: tweets[0].name,
        })
    }
    else {
        tweets.filter(tw => !userStorageMap.has(tw.username)).map(tweet => {
            const userData = {
                user_id: tweet.user_id,
                username: tweet.username,
                name: tweet.name,
            }
            usersMap.set(tweet.username, userData)
        })
    }
    return usersMap
}

const utcToTimestamp = (date) => {
    const d = new Date('2021-09-02 17:18:49 UTC')
    return d.getTime();
}


const generatePostFromTweet = ({ tweet, sourceMap, target, type }) => {
    // console.log('tweet', tweet);
    // console.log('sourceMap', sourceMap);
    // console.log('target', target);
    // console.log('type', type);
    const { source, wif } = sourceMap.get(tweet.username);
    // console.log('tweet.username', tweet.username);
    // console.log('source, ----  wif ', wif);
    // console.log('source, --- address ', source.address);
    const createdAt = utcToTimestamp(tweet.created_at);
    const postModel = new Post({
        source,
        id: tweet.id,
        type: type,
        createdAt,
        text: tweet.tweet,
        target: target ? target : '',
        likesCount: tweet.likes_count,
        commentsCount: tweet.replies_count,
        wif: wif
    });
    return postModel.newPost
}


const generatePostArr = ({ threads, existPostMapStorage, existSourceMapStorage }) => {
    const postArr = [];
    threads.filter(thr => !existPostMapStorage.has(thr.tweet.username)).map(th => {
        const threadHeadPost = generatePostFromTweet({ tweet: th.tweet, sourceMap: existSourceMapStorage, type: 'post' });
        postArr.push(threadHeadPost);
        if (Array.isArray(th.comments)) {
            th.comments.filter(thr => !existPostMapStorage.has(thr.tweet)).map(tw => {
                const target = {
                    sourceHash: threadHeadPost.source.hash,
                    postHash: threadHeadPost.hash
                };
                const commentPost = generatePostFromTweet({ tweet: tw, sourceMap: existSourceMapStorage, target, type: 'reply' });
                postArr.push(commentPost);
            });
        }
    })
    return postArr;
};


const generateSourcesMap = ({ usersMap }) => {
    if (usersMap.size === 0) {
        return usersMap
    }
    for (let entry of usersMap) {
        const userModel = new User({ userName: entry[1].username });
        const userAdopted = userModel.newUser;
        usersMap.set(entry[0], userAdopted);
    }
    return usersMap;
}


const getSubscribedIndex = async ({ subscribed }) => {
    let postSubscribed = [],
        gatheredPosts = [],
        hostSources = [];
    try {
        await Promise.allSettled(
            subscribed.map(async (sbs) => {
                await Promise.allSettled(
                    sbs.hosts.map(async (hst) => {
                        let res = await axiosLib.get(`${hst.index}`);
                        if (res?.data?.index) {
                            postSubscribed.push(res?.data?.index);
                        }
                        if (res?.data?.source) {
                            hostSources.push(res?.data?.source);
                        }
                        return;
                    })
                );
            })
        );
    } catch (e) {
        console.warn("[getSubscribedIndex][Promise.all]", e);
    }

    try {
        postSubscribed.map((posts) => {
            gatheredPosts = [...gatheredPosts, ...posts];
            return posts;
        });
    } catch (e) {
        console.warn("[getSubscribedIndex][gatheredPosts]", e);
    }

    return { gatheredPosts, hostSources };
};

const mapFromArr = ({ arr, keyName }) => {
    const mapData = new Map();
    if (!Array.isArray(arr) || arr.length === 0) {
        return mapData;
    };
    arr.map(item => {
        mapData.set(item[keyName], item);
    });
    return mapData;
}

const getUsersData = async ({ sources }) => {

    const sourcesMap = mapFromArr({ arr: sources, keyName: 'publicName' });
    const dataBaseUserMap = new Map();


    const resultData = await Promise.allSettled(
        sources.map(async (s) => {
            try {
                ({ data } = await axios.post(`${host.API_HOST}${userApi.GET_USER}`, { userName: s.publicName }));
                return data;
            } catch (e) {
                console.warn("[getIndexSaga][getAllHostsIndex]", e);
            }
        })
    )
    resultData.map(data => {
        if (data.status === 'fulfilled' && data?.value?.encryptedWif && data?.value?.userName) {
            const userInstance = new User({});
            userInstance.setUserData = {
                encryptedWif: data.value.encryptedWif,
                userName: data.value.userName,
                source: sourcesMap.get(data.value.userName)
            };
            const user = userInstance.newDataBaseUser;
            dataBaseUserMap.set(user.userName, user);
        }
    })
    return dataBaseUserMap;
}

const getAllHostsIndex = async () => {
    let data;
    try {
        ({ data } = await axios.get(`${host.API_HOST}${userApi.SUBSCRIBED}`));
    } catch (e) {
        console.warn("[getIndexSaga][getAllHostsIndex]", e);
    }

    try {
        const { gatheredPosts, hostSources } = await getSubscribedIndex({
            subscribed: data,
        });
        return { gatheredPosts, hostSources };
    } catch (e) {
        console.warn("[getIndexSaga][getAllHostsIndex][getSubscribedIndex]", e);
        return [];
    }
};

const generateCurrentUserTweetsPath = ({ userName }) => {
    return `${indexes}/${userName}.json`;
}
const generateInboxUserTweetsPath = ({ userName }) => {
    return `${indexes}/inbox-${userName}.json`;
}


const addSourceToNode = async ({ sourceMap }) => {

    try {
        await Promise.allSettled(
            Array.from(sourceMap,
                async ([key, user]) => {
                    const data = {
                        salt: user.salt,
                        verifier: user.verifier,
                        userName: user.userName,
                        address: user.source.address,
                        encryptedWif: user.encryptedWif,
                        source: user.source,
                    };
                    await axios.post(`${userApi.REGISTER}`, data);
                }));
    }
    catch (e) {
        console.warn('[addSourceToNode][addSourceToNode]', e);
    }
}


const delay = ms => new Promise(res => setTimeout(res, ms));

const addPostsToNode = async ({ postArr }) => {
    // postArr.map(async (post, i) => {
    //     try {
    //         await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] });
    //         await sleep(2000);
    //     }
    //     catch (e) {
    //         console.warn('[indexOne][addPostsToNode]', e);
    //     }
    // })


    // try {
    //     PromiseBird.map(postArr, post => {
    //         console.log('post', post.type);
    //         return axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] });
    //     }).then(val => {
    //         console.log({ val });
    //     });

    // } catch (err) {
    //     console.log(err);
    // }
    let backOffTime = 100;
    // for (let i = 0; i < fileIds.length; i++) {
    //     let fileId = fileIds[i];
    //     await getFileName(fileId, auth)
    //         .then((name) => {
    //             // do some work
    //         })
    //         .catch((err) => {
    //             // assumes that the error is "request made too soon"
    //             backOffTime *= 2;
    //             i--;
    //             console.log(err);
    //             return delay(backOffTime);
    //         });
    // }

    /*     for (let i = 0; i < postArr.length; i++) {
            let post = postArr[i];
            await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] })
                .then((name) => {
                    // do some work
                })
                .catch((err) => {
                    console.log('res[][error]', i);
    
                    // assumes that the error is "request made too soon"
                    backOffTime *= 2;
                    i--;
                    console.log(err);
                    return delay(backOffTime);
                });
        } */


    for (let i = 0; i < postArr.length; i++) {
        let post = postArr[i];
        try {
            ({ data } = await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] }));
            console.log('res[addPostResult]', i);
            console.log('res[addPostResult]', data);
        }
        catch (e) {
            console.log('res[addPostResult][error]', e);
            backOffTime *= 2;
            i--;
            await delay(backOffTime);
        }
    }



    /*     try {
            const addPostResult = await Promise.allSettled(
                postArr.map(async (post, i) => {
                    let data;
                    try {
                        ({ data } = await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] }));
                        console.log('res[addPostResult]', data);
                    } catch (e) {
                        console.log('res[addPostResult][error]', e);
                        data = ''
                    } finally {
                        return data
                    }
                    // await sleep(5000);
                })
            )
    
            console.log('addPostResult[addPostResult]', addPostResult);
        }
        catch (e) {
            console.warn('[addPostsToNode][Promise.allSettled]', e)
        } */




}


(async () => {
    let userTweetsArr, userTweetOwnPage, directToUserTweetsArr;
    const { gatheredPosts, hostSources } = await getAllHostsIndex();
    console.log('hostSources[11111111111]', hostSources);
    let existSourceMapStorage = await getUsersData({ sources: hostSources })
    let iterator = 0;
    console.log('existSourceMapStorage[existSourceMapStorage]', existSourceMapStorage.size);

    const userArr = ['glavekonom', 'tamaraperm2', 'teddybearrussia'];

    // let existSourceMapStorage = mapFromArr({ arr: hostSources, keyName: 'publicName' });
    let existPostMapStorage = mapFromArr({ arr: gatheredPosts, keyName: 'id' });
    // let existSourceMapStorage = mapFromArr({ arr: [], keyName: 'publicName' });
    // let existPostMapStorage = mapFromArr({ arr: [], keyName: 'id' });
    let newUsersArr = [];

    const addNewUserFeed = async ({ userName }) => {
        console.log('[addNewUserFeed]----------------[userName]', userName);

        try {
            await updateFile({ filePath: currentUserTweetsPath, newData: '' });
            await executeCommand({ command: getCommandCurrentUserTweets({ userName }) });
        } catch (e) {
            console.warn('[executeCommand][getCurrentUserTweets]', e)
        }

        try {
            // userTweetsArr = await readFile({ filePath: generateCurrentUserTweetsPath({ userName }) });
            userTweetsArr = await readFile({ filePath: currentUserTweetsPath });
            userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);
        } catch (e) {
            console.warn('[readFile][getCurrentUserTweets]', e);
        }

        try {
            await updateFile({ filePath: directToCurrentUserPath, newData: '' });
            await executeCommand({ command: getCommandDirectToUser({ userName }) });
        }
        catch (e) {
            console.warn('[executeCommand][directToUserTweets]', e);
        }

        try {
            // directToUserTweetsArr = await readFile({ filePath: generateInboxUserTweetsPath({ userName }) });
            directToUserTweetsArr = await readFile({ filePath: directToCurrentUserPath });
        } catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }

        console.log('userTweetOwnPage', userTweetOwnPage.length);
        console.log('directToUserTweetsArr', directToUserTweetsArr.length);

        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });

        console.log('threads', threads.length);

        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });
        const combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        console.log('combineUsersMap[[combineUsersMap]]', combineUsersMap.size);

        const sourcesMap = generateSourcesMap({ usersMap: combineUsersMap });

        
        try {
            await addSourceToNode({ sourceMap: sourcesMap });
        } catch (e) {
            console.warn('[addSourceToNode][sourcesMap]', e);
        }

        existSourceMapStorage = new Map([...combineUsersMap, ...existSourceMapStorage]);

        // console.log('userTweetOwnPage', userTweetOwnPage.length);
        // console.log('threads', threads.length);
        // console.log('sourcesMap.size', sourcesMap.size);
        // console.log('combineUsersMap.size', combineUsersMap.size);
        // console.log('existSourceMapStorage.size', existSourceMapStorage.size);

        let directToArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];

        // for (let source of combineSourceMap.entries()) {
        //     // console.log('source', JSON.stringify(source[1]));
        // }

        const postArr = generatePostArr({ threads, existPostMapStorage, existSourceMapStorage });

        console.log('postArr', postArr.length);
        console.log('newUsersArr', newUsersArr.length);
        try {
            await addPostsToNode({ postArr });
        }
        catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }
        const newPostMap = mapFromArr({ arr: postArr, keyName: 'id' });
        existPostMapStorage = new Map([...newPostMap, ...existPostMapStorage]);

        // userArr.length < 50 &&
        while (iterator <= 1000) {
            console.log('iterator', iterator);
            console.log('userArr', userArr);
            // const name = userArr[iterator++];
            const name = newUsersArr[iterator++];
            console.log('[RECURSION]newUsersArrIterator', name);
            await addNewUserFeed({ userName: name });
        }
    }
    await addNewUserFeed({ userName: twitterUserName });
})();

