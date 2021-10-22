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

const generateCurrentUserTweetsPath = ({ userName }) => {
    return `${indexes}/${userName}.json`;
}
const generateInboxUserTweetsPath = ({ userName }) => {
    return `${indexes}/inbox-${userName}.json`;
}

const getCommandCurrentUserTweets = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json" -i a22c974b8730 twint -u ${userName} --retweets -o /home/file.json --json`
}
const getCommandDirectToUser = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/directToCurrentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -s "to:@${userName}"  -o /home/file.json --json`
}

(async () => {
    let iterator = 0, gatheredPosts = [], hostSources = [], existSourceMapStorage = new Map();

    try {
        ({ gatheredPosts, hostSources } = await getAllHostsIndex({ query: publicQuery(), host, userApi }));
        console.log('hostSources', hostSources[0]);
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



    const userArr = ['glavekonom', 'tamaraperm2', 'teddybearrussia'];

    // let existSourceMapStorage = mapFromArr({ arr: hostSources, keyName: 'publicName' });
    // let existSourceMapStorage = mapFromArr({ arr: [], keyName: 'publicName' });
    // let existPostMapStorage = mapFromArr({ arr: [], keyName: 'id' });
    let newUsersArr = [];

    // --images


    const addNewUserFeed = async ({ userName }) => {
        let userTweetsArr, userTweetOwnPage, directToUserTweetsArr, listLikeJsonUser, listLikeJsonInbox;
        console.log('[addNewUserFeed]----------------[userName]', userName);
        try {
            await updateFile({ filePath: currentUserTweetsPath, newData: '' });
            await executeCommand({ command: getCommandCurrentUserTweets({ userName }) });
        } catch (e) {
            console.warn('[executeCommand][getCurrentUserTweets]', e)
        }

        try {
            // listLikeJsonUser = await readFile({ filePath: generateCurrentUserTweetsPath({ userName }) });
            listLikeJsonUser = await readFile({ filePath: currentUserTweetsPath });
        } catch (e) {
            console.log('[[indexOne][appendNewJsonFile]', e);
        }

        try {
            await appendNewJsonFile({ userName, listLikeJson: listLikeJsonUser, type: 'user' });
        } catch (e) {
            console.warn('[indexOne][appendNewJsonFile]', e);
        }

        userTweetsArr = correctJsonData({ listLikeJson: listLikeJsonUser });
        userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);

        try {
            await updateFile({ filePath: directToCurrentUserPath, newData: '' });
            await executeCommand({ command: getCommandDirectToUser({ userName }) });
        }
        catch (e) {
            console.warn('[executeCommand][directToUserTweets]', e);
        }
        try {
            // listLikeJsonInbox = await readFile({ filePath: generateInboxUserTweetsPath({ userName }) });
            listLikeJsonInbox = await readFile({ filePath: directToCurrentUserPath });
        } catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }
        try {
            await appendNewJsonFile({ userName, listLikeJson: listLikeJsonInbox, type: 'inbox' });
        } catch (e) {
            console.warn('[indexOne][appendNewJsonFile]', e);
        }


        directToUserTweetsArr = correctJsonData({ listLikeJson: listLikeJsonInbox });

        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });
        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });
        let combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        const sourcesMap = generateSourcesMap({ usersMap: combineUsersMap });

        // 
        let directToArrNames = Array.from(sourcesMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];
        console.log('newUsersArr', newUsersArr.length);

        // console.log('[sourcesMap!]', sourcesMap);
        try {
            // send data and add token to combineUsersMap
            combineUsersMap = await addSourceToNode({ sourceMap: sourcesMap, query: publicQuery() });
        } catch (e) {
            console.warn('[addSourceToNode][sourcesMap]', e);
        }
        existSourceMapStorage = new Map([...combineUsersMap, ...existSourceMapStorage]);
        console.log('combineUsersMap', combineUsersMap.size);
        console.log('existSourceMapStorage[check]', existSourceMapStorage.size);
        console.log('existPostMapStorage', existPostMapStorage.size);

        let directToArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];

        const postArr = generatePostArr({ threads, existPostMapStorage, existSourceMapStorage });
        console.log('postArr.length', postArr.length);

        try {
            await addPostsToNode({ postArr, protectedQuery });
        }
        catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }
        const newPostMap = mapFromArr({ arr: postArr, keyName: 'id' });
        existPostMapStorage = new Map([...newPostMap, ...existPostMapStorage]);
* /

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

