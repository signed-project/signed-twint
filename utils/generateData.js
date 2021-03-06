const { User } = require("../models/user");
const { Post } = require("../models/post");


const utcToTimestamp = (date) => {
    const d = new Date(date)
    return d.getTime();
}

const generatePostFromTweet = ({ tweet, sourceMap, target, type }) => {
    let attachmentUrl = [];
    const { source, wif, token } = sourceMap.get(tweet.username);
    const createdAt = utcToTimestamp(tweet.created_at);

    if (Array.isArray(tweet.photos) && tweet.photos.length > 0) {
        attachmentUrl = tweet.photos.map(ph => ({ url: ph }));
    }
    const postModel = new Post({
        source,
        id: tweet.id,
        type: type,
        createdAt,
        text: tweet.tweet,
        target: target ? target : '',
        likesCount: tweet.likes_count,
        commentsCount: tweet.replies_count,
        wif: wif,
        attachmentUrl: attachmentUrl,
    });
    return { ...postModel.newPost, token }
}

const generatePostLikeAcceptedInInbox = ({ post, sourceMap, ownerFeedSource }) => {
    const { source, wif, token } = sourceMap.get(ownerFeedSource.publicName);

    const postModelInbox = new Post({
        ...post,
        ownerFeedSourceAddress: source.address,
        postId: post.id,
        wif: wif,
    });
    return { ...postModelInbox.addSignature, token, destinationAddress: ownerFeedSource.address }
}

const generatePostArr = ({ threads, existPostMapStorage, existSourceMapStorage }) => {
    const postArr = [];
    if (!existSourceMapStorage.size > 0) {
        console.warn('[generatePostArr][!existPostMapStorage.size > 0]');
        return postArr
    }
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
                const commentPostCopy = JSON.parse(JSON.stringify(commentPost));
                const commentPostOwnerFeed = generatePostLikeAcceptedInInbox({
                    post: commentPostCopy,
                    sourceMap: existSourceMapStorage,
                    ownerFeedSource: threadHeadPost.source
                });
                postArr.push(commentPostOwnerFeed);
            });
        }
    })
    return postArr;
};


const generateSourcesMap = ({ usersMap }) => {
    console.log("Generating sources map for " + usersMap.size + " users")
    if (usersMap.size === 0) {
        return usersMap
    }
    for (let entry of usersMap) {
        console.log("Creating " + entry[1].username + " username")
        const userModel = new User({ userName: entry[1].username });
        const userAdopted = userModel.newUser;
        usersMap.set(entry[0], userAdopted);
    }
    return usersMap;
}


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


const generateTweetThreads = ({ onwTweets, tweetsToUser }) => {

    if (!Array.isArray(onwTweets) || !Array.isArray(tweetsToUser)) {
        return []
    }
    const tweetAndCommentsArr = onwTweets.map(tw => {
        // const commentsList = tweetsToUser.filter(t => t.conversation_id === tw.conversation_id);
        // if (commentsList.length > 0) {
        //     console.log('____________________commentsList____________________', commentsList.length);
        //     console.log('____________________onwTweets____________________', onwTweets.length);
        // }
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

const correctJsonData = ({ listLikeJson }) => {
    const listLikeJsonWithoutSpace = listLikeJson.trim()
    const jsonDataArr = "[" + listLikeJsonWithoutSpace.replace(/\n/g, ",") + "]";
    return JSON.parse(jsonDataArr);
}


module.exports = {
    generateUserMap,
    generateTweetThreads,
    mapFromArr,
    generateSourcesMap,
    generatePostArr,
    generatePostFromTweet,
    correctJsonData
}