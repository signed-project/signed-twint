const getCommandCurrentUserTweets = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/currentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -u ${userName} -o /home/file.json --json`
}

const getCommandDirectToUser = ({ userName }) => {
    return `docker run --mount type=bind,source="${__dirname}/directToCurrentUserTweets.json,target=/home/file.json"  -i a22c974b8730 twint -s "to:@${userName}"  -o /home/file.json --json`
}

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


exports = {
    getCommandDirectToUser,
    getCommandCurrentUserTweets,
    executeCommand
}