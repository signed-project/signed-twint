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



// const twitterUserName = 'fcsm_official';
// const userName = 'Bg53G';
// const twitterUserName = 'asamigate';
const twitterUserName = 'Bg53G';
// const twitterUserName = 'elonmusk';

// const twitterUserName = 'bbseva';

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

    let newUsersArr = [];



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

        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });
        let combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        const sourcesMap = generateSourcesMap({ usersMap: combineUsersMap });

        let directToArrNames = Array.from(sourcesMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];
        console.log('newUsersArr', newUsersArr.length);

        existSourceMapStorage = new Map([...combineUsersMap, ...existSourceMapStorage]);

        let directToArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...directToArrNames];

        while (iterator <= 1000) {
            console.log('iterator', iterator);
            const name = newUsersArr[iterator++];
            console.log('[RECURSION]newUsersArrIterator', name);
            await addNewUserFeed({ userName: name });
        }
    }
    await addNewUserFeed({ userName: twitterUserName });
})();

