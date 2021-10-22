const { default: axiosLib } = require("axios");
const { exec, spawn } = require("child_process");
const execSh = require("exec-sh");
const parseJson = require('parse-json');
const { promisify } = require('util');
const { User } = require("./models/user");
const { Post } = require("./models/post");
const { publicQuery, protectedQuery } = require("./utils/dataBaseQuery/query");
const { host, userApi, postApi } = require("./config");
const execAsync = promisify(exec);
const sleep = require('util').promisify(setTimeout)
const PromiseBird = require('bluebird');
const currentUserTweetsPath = './currentUserTweets.json';
const directToCurrentUserPath = './directToCurrentUserTweets.json';
// const indexes = './indexes_copy';
const indexes = './indexes';
const { getAllHostsIndex, getUsersData } = require('./utils/dataBaseQuery/receiveBaseData');
const { addPostsToNode, addSourceToNode } = require('./utils/dataBaseQuery/sendToDataBase');
const { readFile, updateFile, appendNewJsonFile } = require('./utils/fs');
const { generatePostArr, generateSourcesMap, generatePostFromTweet,
    generateTweetThreads, generateUserMap, mapFromArr, correctJsonData } = require('./utils/generateData');
const { executeCommand } = require('./utils/bashCommands');


// const twitterUserName = 's_vakarchuk';
// const twitterUserName = 'fcsm_official';
// const userName = 'Bg53G';
// const twitterUserName = 'asamigate';
const twitterUserName = 'Bg53G';
// const twitterUserName = 'elonmusk';
// const twitterUserName = '12r8PojfmPOBqdL';
// const twitterUserName = 'bbseva';
//  --images
// const getCurrentUserTweets = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} -o /home/file.json --json`;


const generatePath = ({ indexes, userName, type }) => {
    const userMark = `${type}_${userName}`;
    return `${indexes}/${userMark}.json`;
}
// const generateInboxUserTweetsPath = ({ userName }) => {
//     return `${indexes}/inbox-${userName}.json`;
// }

const getCommandCurrentUserTweets = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json" -i a22c974b8730 twint -u ${userName} --retweets -o /home/file.json --json`
}
const getCommandDirectToUser = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/directToCurrentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -s "to:@${userName}"  -o /home/file.json --json`
}

(async () => {
    let iterator = 0,
        gatheredPosts = [],
        hostSources = [],
        existSourceMapStorage = new Map(),
        newUsersArr = [];
    try {
        ({ gatheredPosts, hostSources } = await getAllHostsIndex({ query: publicQuery(), host, userApi }));
    } catch (e) {
        console.warn('[indexOne][getUsersData]', e);
    }

    try {
        existSourceMapStorage = await getUsersData({ sources: hostSources, query: publicQuery() });
        console.log('existSourceMapStorage', existSourceMapStorage.size);
    } catch (e) {
        console.warn('[indexOne][getUsersData]', e);
    }
    let existPostMapStorage = mapFromArr({ arr: gatheredPosts, keyName: 'id' });

    const addNewUserFeed = async ({ userName }) => {
        let userTweetsArr, userTweetOwnPage, directToUserTweetsArr, listLikeJsonUser, listLikeJsonInbox;
        console.log('[addNewUserFeed]----------------[userName]', userName);

        try {
            listLikeJsonUser = await readFile({ filePath: generatePath({ indexes, userName, type: 'user' }) });
        } catch (e) {
            console.log('[[indexOne][appendNewJsonFile]', e);
        }

        userTweetsArr = correctJsonData({ listLikeJson: listLikeJsonUser });
        userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);
        // console.log('listLikeJson[userTweetOwnPage]', userTweetOwnPage.length);

        try {
            listLikeJsonInbox = await readFile({ filePath: generatePath({ indexes, userName, type: 'inbox' }) });
        } catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }

        directToUserTweetsArr = correctJsonData({ listLikeJson: listLikeJsonInbox });
        console.log('listLikeJson[directToUserTweetsArr[data data data ]]', directToUserTweetsArr.length);
        // const directToUserTweetsArrAttachments = directToUserTweetsArr.filter(tweet => tweet.attachments.length > 0);

        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });


        // console.log('threads one', threads[0]);
        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });
        let combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        const sourcesMap = generateSourcesMap({ usersMap: combineUsersMap });

        try {
            hashedTargetPost = await addSourceToNode({ sourceMap: sourcesMap, query: publicQuery() });
            hashedTargetPost = []
        } catch (e) {
            console.warn('[addSourceToNode][sourcesMap]', e);
        }
        existSourceMapStorage = new Map([...combineUsersMap, ...existSourceMapStorage]);

        let directToArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];

        const postArr = generatePostArr({ threads, existPostMapStorage, existSourceMapStorage });
        // const tweetsWithAttachments = postArr.filter(tweet => tweet.attachments.length > 0);
        const tweetsComments = postArr.filter(tweet => tweet.signatures.length === 2);
        console.log('postArr.length', postArr.length);
        console.log('tweetsComments[length]', tweetsComments.length);

        try {
            await addPostsToNode({ postArr, protectedQuery });
        }
        catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }
        const newPostMap = mapFromArr({ arr: postArr, keyName: 'id' });
        existPostMapStorage = new Map([...newPostMap, ...existPostMapStorage]);

        // while (newUsersArr <= 3) {
        //     console.log('iterator', iterator);
        //     console.log('userArr', userArr);
        //     // const name = userArr[iterator++];
        //     const name = newUsersArr[iterator++];
        //     console.log('[RECURSION]newUsersArrIterator', name);
        //     await addNewUserFeed({ userName: name });
        // }
    }
    await addNewUserFeed({ userName: twitterUserName });
})();

