const { default: axiosLib } = require("axios");
const { exec, spawn } = require("child_process");
const execSh = require("exec-sh");

const parseJson = require('parse-json');
const { promisify } = require('util');
const { User } = require("./models/user");
const { Post } = require("./models/post");
const { Query } = require("./models/query");
const { host, userApi, postApi } = require("./config");
const execAsync = promisify(exec);
const sleep = require('util').promisify(setTimeout)
const PromiseBird = require('bluebird');
const currentUserTweetsPath = './currentUserTweets.json';
const directToCurrentUserPath = './directToCurrentUserTweets.json';
const indexes = './indexes';
const { getAllHostsIndex, getUsersData } = require('./utils/dataBaseQuery/receiveBaseData');
const { addPostsToNode, addSourceToNode } = require('./utils/dataBaseQuery/sendToDataBase');
const { readFile } = require('./utils/fs');
const { generatePostArr, generateSourcesMap, generatePostFromTweet,
    generateTweetThreads, generateUserMap, mapFromArr } = require('./utils/generateData')


// const twitterUserName = 's_vakarchuk';
// const twitterUserName = 'fcsm_official';
// const userName = 'Bg53G';
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



(async () => {
    let userTweetsArr, userTweetOwnPage, directToUserTweetsArr;
    let iterator = 0;
    const queryItem = new Query({});
    const publicQuery = queryItem.publicQuery;
    const { gatheredPosts, hostSources } = await getAllHostsIndex({ query: publicQuery, host, userApi });
    // console.log('hostSources', hostSources.length);
    let existSourceMapStorage = await getUsersData({ sources: hostSources, query: publicQuery });
    let existPostMapStorage = mapFromArr({ arr: gatheredPosts, keyName: 'id' });
    // console.log('existSourceMapStorage', existSourceMapStorage);
    console.log('existSourceMapStorage', existSourceMapStorage.size);



    const userArr = ['glavekonom', 'tamaraperm2', 'teddybearrussia'];

    // let existSourceMapStorage = mapFromArr({ arr: hostSources, keyName: 'publicName' });
    // let existSourceMapStorage = mapFromArr({ arr: [], keyName: 'publicName' });
    // let existPostMapStorage = mapFromArr({ arr: [], keyName: 'id' });
    let newUsersArr = [];

    const addNewUserFeed = async ({ userName }) => {
        console.log('[addNewUserFeed]----------------[userName]', userName);

        try {
            // await updateFile({ filePath: currentUserTweetsPath, newData: '' });
            // await executeCommand({ command: getCommandCurrentUserTweets({ userName }) });
        } catch (e) {
            console.warn('[executeCommand][getCurrentUserTweets]', e)
        }

        try {
            userTweetsArr = await readFile({ filePath: generateCurrentUserTweetsPath({ userName }) });
            // userTweetsArr = await readFile({ filePath: currentUserTweetsPath });
            userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);
        } catch (e) {
            console.warn('[readFile][getCurrentUserTweets]', e);
        }

        try {
            // await updateFile({ filePath: directToCurrentUserPath, newData: '' });
            // await executeCommand({ command: getCommandDirectToUser({ userName }) });
        }
        catch (e) {
            console.warn('[executeCommand][directToUserTweets]', e);
        }

        try {
            directToUserTweetsArr = await readFile({ filePath: generateInboxUserTweetsPath({ userName }) });
            // directToUserTweetsArr = await readFile({ filePath: directToCurrentUserPath });
        } catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }


        const threads = generateTweetThreads({ onwTweets: userTweetOwnPage, tweetsToUser: directToUserTweetsArr });


        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });
        const combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        const sourcesMap = generateSourcesMap({ usersMap: combineUsersMap });


        try {
            // await addSourceToNode({ sourceMap: sourcesMap, query: publicQuery });
        } catch (e) {
            console.warn('[addSourceToNode][sourcesMap]', e);
        }

        existSourceMapStorage = new Map([...combineUsersMap, ...existSourceMapStorage]);

        let directToArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];

        const postArr = generatePostArr({ threads, existPostMapStorage, existSourceMapStorage });
        try {
            // await addPostsToNode({ postArr, query: publicQuery });
        }
        catch (e) {
            console.warn('[readFile][directToUserTwitsArr]', e);
        }
        const newPostMap = mapFromArr({ arr: postArr, keyName: 'id' });
        existPostMapStorage = new Map([...newPostMap, ...existPostMapStorage]);


        /*    while (iterator <= 1000) {
               console.log('iterator', iterator);
               console.log('userArr', userArr);
               const name = userArr[iterator++];
               // const name = newUsersArr[iterator++];
               console.log('[RECURSION]newUsersArrIterator', name);
               await addNewUserFeed({ userName: name });
           } */
    }
    await addNewUserFeed({ userName: twitterUserName });
})();

