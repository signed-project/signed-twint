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

const currentUserTweetsPath = './currentUserTweets.json';
const directToCurrentUserPath = './directToCurrentUserTweets.json';
// const twitterUserName = 's_vakarchuk';
// const twitterUserName = 'fcsm_official';
// const twitterUserName = 'Bg53G';
const twitterUserName = 'glavekonom';
// const twitterUserName = 'elonmusk';
// const twitterUserName = '12r8PojfmPOBqdL';
// const twitterUserName = 'bbseva';
//  --images
// const getCurrentUserTweets = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} -o /home/file.json --json`;
const directToUserTweets = `docker run --mount type=bind,source="${__dirname}/directToCurrentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -s "to:@${twitterUserName}"  -o /home/file.json --json`;
const getUserTweetsBashSince = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} --since 2021-12-20 -o /home/file.json --json`;











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
    const tweetAndCommentsArr = onwTweets.map(tw => {
        const commentsList = tweetsToUser.filter(t => t.conversation_id === tw.conversation_id);
        if (commentsList.length > 0) {
            // console.log('____________________commentsList____________________', commentsList.length);
            // console.log('____________________onwTweets____________________', onwTweets.length);
        }
        return ({
            comments: tweetsToUser.filter(t => t.conversation_id === tw.conversation_id),
            tweet: tw
        });
    })
    return tweetAndCommentsArr;
}


const generateUserMap = ({ tweets, isCurrent = false }) => {
    const usersMap = new Map();
    if (!Array.isArray(tweets) || tweets.length === 0) {
        return usersMap
    }
    if (isCurrent) {
        usersMap.set(tweets[0].username, {
            user_id: tweets[0].user_id,
            username: tweets[0].username,
            name: tweets[0].name,
        })
    }
    else {
        tweets.map(tweet => {
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


const generatePostFromTweet = ({ tweet, combineSourceMap, target, type }) => {
    const { source, wif } = combineSourceMap.get(tweet.username);
    const createdAt = utcToTimestamp(tweet.created_at);
    const postModel = new Post({
        source,
        id: tweet.id,
        type: type,
        createdAt,
        text: tweet.tweet,
        target,
        likesCount: tweet.likes_count,
        commentsCount: tweet.replies_count,
        wif: wif
    });
    return postModel.newPost
}


const generatePostList = ({ threads, combineSourceMap }) => {
    console.log('[generatePostList][threads]', threads.length);
    const postList = [];
    const headPostsWithComments = threads.map(th => {
        const threadHeadPost = generatePostFromTweet({ tweet: th.tweet, combineSourceMap, type: 'post' });
        postList.push(threadHeadPost)
        th.comments.map(tw => {
            const target = {
                sourceHash: threadHeadPost.source.hash,
                postHash: threadHeadPost.hash
            };
            const commentPost = generatePostFromTweet({ tweet: tw, combineSourceMap, target, type: 'reply' });
            postList.push(commentPost);
        });
    })
    return postList;
};




const generateSourcesMap = ({ usersMap }) => {
    console.log('usersMap.size', usersMap.size);
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

const mapToArray = ({ arr, keyName }) => {
    const mapData = new Map();
    if (!Array.isArray(arr)) {
        return;
    };
    arr.map(item => {
        mapData.set(item[keyName], item);
    });
    return mapData;
}

(async () => {
    let userTweetsArr, userTweetOwnPage, directToUserTweetsArr;
    const { gatheredPosts, hostSources } = await getAllHostsIndex();
    let iterator = 0;
    let existSourceMapStorage = mapToArray({ arr: hostSources, keyName: 'publicName' });
    let existPostMapStorage = mapToArray({ arr: gatheredPosts, keyName: 'id' });
    let newUsersArr = [];

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
                        if (!existSourceMapStorage.has(user.userName)) {
                            await axios.post(`${userApi.REGISTER}`, data);
                        }
                    }));
            // existSourceMapStorage = new Map([...existSourceMapStorage, ...sourceMap]);
            existSourceMapStorage = new Map([...sourceMap, ...existSourceMapStorage]);
        }
        catch (e) {
            console.warn('[addSourceToNode][addSourceToNode]', e)
        }
    }

    const addPostsToNode = async ({ postList }) => {
        const newPostMap = mapToArray({ arr: postList });
        await Promise.allSettled(
            postList.map(async (post) => {
                if (!existPostMapStorage.has(post.id)) {
                    console.log('[post][not exist]!!!!', post.type);
                    await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] });
                }
            })
        )
        existPostMapStorage = new Map([...newPostMap, ...existPostMapStorage]);
    }

    const addNewUserFeed = async ({ userName }) => {

        console.log('[addNewUserFeed]----------------[userName]', userName);

        try {
            await updateFile({ filePath: currentUserTweetsPath, newData: '' });
            await executeCommand({ command: getCommandCurrentUserTweets({ userName }) });
        }
        catch (e) {
            console.warn('[executeCommand][getCurrentUserTweets]', e)
        }

        try {
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
            directToUserTweetsArr = await readFile({ filePath: directToCurrentUserPath });
        } catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }


        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });
        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true });

        const sourceDirectToMap = generateSourcesMap({ usersMap: usersDirectToMap });
        const sourceCurrentMap = generateSourcesMap({ usersMap: currentUserMap });



        try {
            await addSourceToNode({ sourceMap: sourceDirectToMap });
        } catch (e) {
            console.warn('[addSourceToNode][sourceDirectToMap]', e);
        }
        try {
            // add current user, to subscribe his on all users direct to current
            await addSourceToNode({ sourceMap: sourceCurrentMap });
        } catch (e) {
            console.warn('[addSourceToNode][sourceCurrentMap]', e);
        }


        const combineSourceMap = new Map([...sourceDirectToMap, ...sourceCurrentMap]);
        let directToArrNames = Array.from(sourceDirectToMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];

        // for (let source of combineSourceMap.entries()) {
        //     // console.log('source', JSON.stringify(source[1]));
        // }

        const postList = generatePostList({ threads, combineSourceMap: new Map([...sourceDirectToMap, ...sourceCurrentMap]) });

        console.log('[indexRecursion][usersDirectToMap]', usersDirectToMap.size);
        console.log('[indexRecursion][currentUserMap]', currentUserMap.size);
        console.log('[indexRecursion][postList.length]', postList.length);

        try {
            await addPostsToNode({ postList })
        }
        catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }

        while (newUsersArr.length < 50) {
            console.log('iterator', iterator);
            const name = newUsersArr[iterator++];
            console.log('[RECURSION]newUsersArrIterator', name);
            await addNewUserFeed({ userName: name });
        }
    }

    // await addNewUserFeed({ userName: 'glavekonom' })
    await addNewUserFeed({ userName: twitterUserName })
})();

