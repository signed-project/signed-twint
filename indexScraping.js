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
const { executeCommand } = require('./utils/bashCommands');

// const twitterUserName = 'Bg53G';
const twitterUserName = 'ParikPatelCFA';
// const folderPath = './indexes';
const folderPath = './indexesTest';
const maxNamesPerUser = 1000;
const maxIterator = 1000;
const currentUserFileName = 'currentUserTweets.json';
const directToUserFileName = 'directToCurrentUserTweets.json';
const useDocker = false;

// for short list of files 
// const indexesFilePath = './indexes_copy'; 


const generateCurrentUserTweetsPath = ({ userName }) => {
    return `${indexes}/${userName}.json`;
}
const generateInboxUserTweetsPath = ({ userName }) => {
    return `${indexes}/inbox-${userName}.json`;
}



//!!! if does't use docker need define how set path (currentUserTweets.json or directToCurrentUserTweets.json), like path where twint save data
const getCommandCurrentUserTweets = ({ userName, useDocker, fileName }) => {
    let command;
    if (!useDocker) {
        command = `twint -u ${userName} --retweets -o ${__dirname}/${fileName} --json`
    }
    else command = `docker run --mount type=bind,source="${__dirname}/${fileName},target=/home/file.json" -i a22c974b8730 twint -u ${userName} --retweets -o /home/file.json --json`
    return command;
}

//    -o /home/file.json --json
const getCommandDirectToUser = ({ userName, useDocker, fileName }) => {
    let command;
    if (!useDocker) {
        command = `twint -s "to:@${userName}"  -o ${__dirname}/${fileName} --json`
    }
    else command = `docker run --mount type=bind,source="${__dirname}/${fileName},target=/home/file.json"  -i a22c974b8730 twint -s "to:@${userName}"  -o /home/file.json --json`
    return command;
}

(async () => {
    let iterator = 0, gatheredPosts = [], hostSources = [], existSourceMapStorage = new Map();
    let newUsersArr = [];

    const addNewUserFeed = async ({ userName, maxLevels }) => {
        let userTweetsArr, userTweetOwnPage, directToUserTweetsArr, listLikeJsonUser, listLikeJsonInbox;
        try {
            await updateFile({ filePath: currentUserTweetsPath, newData: '' });
            await executeCommand({ command: getCommandCurrentUserTweets({ userName, useDocker: useDocker, fileName: currentUserFileName }) });
        } catch (e) {
            console.warn('[executeCommand][getCurrentUserTweets]', e)
        }

        try {
            listLikeJsonUser = await readFile({ filePath: currentUserTweetsPath });
        } catch (e) {
            console.log('[[indexOne][appendNewJsonFile]', e);
        }

        try {
            await appendNewJsonFile({ userName, listLikeJson: listLikeJsonUser, type: 'user', folderPath });
        } catch (e) {
            console.warn('[indexOne][appendNewJsonFile]', e);
        }

        userTweetsArr = correctJsonData({ listLikeJson: listLikeJsonUser });
        userTweetOwnPage = userTweetsArr.filter(tweet => tweet.reply_to.length === 0);

        try {
            await updateFile({ filePath: directToCurrentUserPath, newData: '' });
            await executeCommand({ command: getCommandDirectToUser({ userName, useDocker: useDocker, fileName: directToUserFileName }) });
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
            await appendNewJsonFile({ userName, listLikeJson: listLikeJsonInbox, type: 'inbox', folderPath });
        } catch (e) {
            console.warn('[indexOne][appendNewJsonFile]', e);
        }


        directToUserTweetsArr = correctJsonData({ listLikeJson: listLikeJsonInbox });
        const usersDirectToMap = generateUserMap({ tweets: directToUserTweetsArr, userStorageMap: existSourceMapStorage });
        const currentUserMap = generateUserMap({ tweets: userTweetOwnPage, isCurrent: true, userStorageMap: existSourceMapStorage });

        let combineUsersMap = new Map([...usersDirectToMap, ...currentUserMap]);
        let currentArrNames = Array.from(combineUsersMap.keys());
        newUsersArr = [...newUsersArr, ...currentArrNames];

        while (iterator <= 1000) {
            console.log('iterator', iterator);
            const name = newUsersArr[iterator++];
            console.log('[RECURSION]newUsersArrIterator', name);
            if (maxLevels) await addNewUserFeed({ userName: name, maxLevels: --maxLevels });
        }
    }
    await addNewUserFeed({ userName: twitterUserName, maxLevels: 100 });
})();

