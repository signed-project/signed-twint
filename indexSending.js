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
const { getAllHostsIndex, getUsersData } = require('./utils/dataBaseQuery/receiveBaseData');
const { addPostsToNode, addSourceToNode } = require('./utils/dataBaseQuery/sendToDataBase');
const { readFile, updateFile, appendNewJsonFile } = require('./utils/fs');
const { generatePostArr, generateSourcesMap, generatePostFromTweet,
    generateTweetThreads, generateUserMap, mapFromArr, correctJsonData } = require('./utils/generateData');


const twitterUserName = 'Bg53G';
const folderPath = './indexes_copy';
// const folderPath = './indexes';
// const getCurrentUserTweets = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} -o /home/file.json --json`;


const generatePath = ({ folderPath, userName, type, }) => {
    const userMark = `${type}_${userName}`;
    return `${folderPath}/${userMark}.json`;
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

    const addNewUserFeed = async ({ userName, maxLevels }) => {
        let userTweetsArr, userTweetOwnPage, directToUserTweetsArr, listLikeJsonUser, listLikeJsonInbox;
        console.log('[addNewUserFeed]----------------[userName]', userName);

        try {
            listLikeJsonUser = await readFile({ filePath: generatePath({ folderPath, userName, type: 'user' }) });
        } catch (e) {
            console.log('[[indexOne][appendNewJsonFile]', e);
        }

        userTweetsArr = correctJsonData({ listLikeJson: listLikeJsonUser });
        userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);
        userTweetOwnPage = userTweetOwnPage.reverse();
        try {
            listLikeJsonInbox = await readFile({ filePath: generatePath({ folderPath, userName, type: 'inbox' }) });
        } catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }

        directToUserTweetsArr = correctJsonData({ listLikeJson: listLikeJsonInbox });
        console.log('listLikeJson[directToUserTweetsArr[data data data ]]', directToUserTweetsArr.length);
        // const directToUserTweetsArrAttachments = directToUserTweetsArr.filter(tweet => tweet.attachments.length > 0);

        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });

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



        try {
            await addPostsToNode({ postArr, protectedQuery });
        }
        catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }
        const newPostMap = mapFromArr({ arr: postArr, keyName: 'id' });
        existPostMapStorage = new Map([...newPostMap, ...existPostMapStorage]);

        while (iterator <= 100) {
            console.log('iterator', iterator);
            console.log('userArr', userArr);
            // const name = userArr[iterator++];
            const name = newUsersArr[iterator++];
            console.log('[RECURSION]newUsersArrIterator', name);
            if (maxLevels) await addNewUserFeed({ userName: name, maxLevels: --maxLevels });
        }
    }
    await addNewUserFeed({ userName: twitterUserName, maxLevels: 100 });
})();
