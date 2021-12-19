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


const twitterUserName = 'ParikPatelCFA';
const folderPath = './indexesTest';
// const folderPath = './indexes';
// const getCurrentUserTweets = `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${twitterUserName} -o /home/file.json --json`;


const generatePath = ({ folderPath, userName, type }) => {
    const userMark = ``;
    return `${folderPath}/${type}_${userName}.json`;
}




(async () => {
    let iterator = 0,
        gatheredPosts = [],
        hostSources = [],
        existSourceMapStorage = new Map(),
        newUsersArr = [];

        ({ gatheredPosts, hostSources } = await getAllHostsIndex({ query: publicQuery(), host, userApi }));
        let existPostMapStorage = mapFromArr({ arr: gatheredPosts, keyName: 'id' });

        existSourceMapStorage = await getUsersData({ sources: hostSources, query: publicQuery() });
        console.log('existSourceMapStorage', existSourceMapStorage.size);

    

    const addNewUserFeed = async ({ userName, maxLevels }) => {
        let userTweetsArr, userTweetOwnPage, directToUserTweetsArr, listLikeJsonUser, listLikeJsonInbox;
        console.log('addNewUserFeed for user ' + userName);

        let filePath = generatePath({ folderPath, userName, type: 'user' })
        console.log('Reading ' + userName + ' tweets from '+ filePath)
        listLikeJsonUser = await readFile({ filePath });
        userTweetsArr = correctJsonData({ listLikeJson: listLikeJsonUser });
        console.log('Got ' + userTweetsArr.length + ' tweets')

        userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);
        userTweetOwnPage = userTweetOwnPage.reverse();
        console.log('Of which ' + userTweetOwnPage.length + ' are not replies to somebody else')

        filePath = generatePath({ folderPath, userName, type: 'inbox' })
        console.log('Reading replies to user from '+ filePath)
        listLikeJsonInbox = await readFile({ filePath });
        directToUserTweetsArr = correctJsonData({ listLikeJson: listLikeJsonInbox });
        console.log('Got ' + directToUserTweetsArr.length + ' tweets')

        directToUserTweetsArr.sort((a,b) => {a.created_at > b.created_at})
        directToUserTweetsArr = directToUserTweetsArr.slice(-5)
        // const directToUserTweetsArrAttachments = directToUserTweetsArr.filter(tweet => tweet.attachments.length > 0);

        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });
        console.log("Generated " + threads.length + " threads")

        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        console.log("1")
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });
        console.log("2")
        let combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        console.log("3")
        const sourcesMap = generateSourcesMap({ usersMap: combineUsersMap });
        console.log("4")
        hashedTargetPost = await addSourceToNode({ sourceMap: sourcesMap, query: publicQuery() });
        hashedTargetPost = []
        console.log("5")
        existSourceMapStorage = new Map([...combineUsersMap, ...existSourceMapStorage]);
        console.log("6")
        let directToArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];
        console.log("7")
        const postArr = generatePostArr({ threads, existPostMapStorage, existSourceMapStorage });
        console.log("8")
        await addPostsToNode({ postArr, protectedQuery });
        console.log("9")
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
