const { getSignatures, getHash, getRegisterUserData, getDataSrp } = require("../libs/signature");
const { credentials, host, publicApi, inboxApi } = require('../config')



// {
//     "id": 1433479540538544137,
//     "conversation_id": "1433348206105178115",
//     "created_at": "2021-09-02 17:18:49 UTC",
//     "date": "2021-09-02",
//     "time": "17:18:49",
//     "timezone": "+0000",
//     "user_id": 1366737138046353413,
//     "username": "alexanderkolc12",
//     "name": "большой шлёпа",
//     "place": "",
//     "tweet": "@12r8PojfmPOBqdL @oyurkov @prof_preobr Хохла спросить забыли))))))",
//     "language": "ru",
//     "mentions": [],
//     "urls": [],
//     "photos": [],
//     "replies_count": 0,
//     "retweets_count": 0,
//     "likes_count": 0,
//     "hashtags": [],
//     "cashtags": [],
//     "link": "https://twitter.com/AlexanderKolc12/status/1433479540538544137",
//     "retweet": false,
//     "quote_url": "",
//     "video": 0,
//     "thumbnail": "",
//     "near": "",
//     "geo": "",
//     "source": "",
//     "user_rt_id": "",
//     "user_rt": "",
//     "retweet_id": "",
//     "reply_to": [
//         {
//             "screen_name": "12r8PojfmPOBqdL",
//             "name": "Наталія Іжевська",
//             "id": "1184172326415491074"
//         },
//         {
//             "screen_name": "oyurkov",
//             "name": "Oleg Yurkov",
//             "id": "19933278"
//         },
//         {
//             "screen_name": "prof_preobr",
//             "name": "Проф. Преображенский",
//             "id": "853612426377523200"
//         }
//     ],
//     "retweet_date": "",
//     "translate": "",
//     "trans_src": "",
//     "trans_dest": ""
// }


class Post {
    constructor(data) {
        this.data = {
            source: data.source,
            ownerFeedSourceAddress: data.ownerFeedSourceAddress ? data.ownerFeedSourceAddress : '',
            // id: `twitter_${data.id}`,
            id: data.postId ? data.postId : `twitter_${data.id}`,
            type: data.type,
            createdAt: data.createdAt ? data.createdAt : 0,
            updatedAt: data.createdAt ? data.createdAt : 0,
            text: data.text,
            attachments: Array.isArray(data.attachmentUrl) && data.attachmentUrl.length > 0 ? data.attachmentUrl : [],
            target: data.target ? data.target : '',
            likesCount: data.likesCount ? data.likesCount : 0,
            repostsCount: data.repostsCount ? data.repostsCount : 0,
            commentsCount: data.commentsCount ? data.commentsCount : 0,
            mentions: data.mentions ? data.mentions : '',
            tags: data.tags ? data.tags : [],
            hash: data.hash ? data.hash : '',
            signatures: data.signatures ? data.signatures : '',
            wif: data.wif,
        }
    }

    get addSignature() {
        const post = {
            source: this.data.source,
            id: this.data.id,
            type: this.data.type,
            createdAt: this.data.createdAt,
            updatedAt: this.data.updatedAt,
            text: this.data.text,
            attachments: this.data.attachments,
            target: this.data.target,
            likesCount: this.data.likesCount,
            repostsCount: this.data.repostsCount,
            commentsCount: this.data.commentsCount,
            mentions: this.data.mentions,
            hash: this.data.hash,
        };

        const newSignature = getSignatures({ data: post, wif: this.data.wif });
        const signatureItem = {
            signature: newSignature,
            address: this.data.ownerFeedSourceAddress
        };
        if (Array.isArray(this.data.signatures)) {
            this.data.signatures.push(signatureItem)
        }
        return {
            ...post,
            signatures: this.data.signatures,
            destinationAddress: this.data.destinationAddress,
        }
    }

    get newPost() {
        const post = {
            source: this.data.source,
            id: this.data.id,
            type: this.data.type,
            createdAt: this.data.createdAt,
            updatedAt: this.data.createdAt,
            text: this.data.text,
            attachments: this.data.attachments,
            target: this.data.target,
            likesCount: this.data.likesCount,
            repostsCount: this.data.repostsCount,
            commentsCount: this.data.commentsCount,
            mentions: this.data.mentions,
        };

        const hash = getHash({ data: post });
        const signature = getSignatures({ data: post, wif: this.data.wif });
        return {
            ...post,
            signatures: [{ signature, address: this.data.source.address }],
            hash: hash,
        }
    }
}


module.exports = {
    Post: Post
}