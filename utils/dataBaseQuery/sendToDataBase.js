const { host, userApi, postApi } = require("../../config");
const user = require("../../models/user");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const addSourceToNode = async ({ sourceMap, query }) => {
    if (!sourceMap.size > 0) {
        return new Map();
    }

    console.log("sourceMap.size[addSourceToNode]", sourceMap.size);
    const sourceMapCopy = new Map([...sourceMap]);
    // new Map(JSON.parse(JSON.stringify(Array.from(source))));
    console.log("sourceMapCopy[addSourceToNode]", sourceMapCopy.size);
    try {
        const result = await Promise.allSettled(
            Array.from(sourceMap, async ([key, user]) => {
                const data = {
                    salt: user.salt,
                    verifier: user.verifier,
                    userName: user.userName,
                    address: user.source.address,
                    encryptedWif: user.encryptedWif,
                    source: user.source,
                };
                let aliasData;
                try {
                    ({ data: aliasData } = await query.post(`${userApi.REGISTER}`, data));
                    if (aliasData.accessToken) {
                        sourceMapCopy.set(key, { ...user, token: aliasData.accessToken });
                    }
                } catch (e) {
                    console.warn("[addSourceToNode][addSourceToNode]", e);
                } finally {
                    return aliasData;
                }
            })
        );
        // result.map(res => {
        //     if (res.status === 'fulfilled' && res.value.accessToken) {
        //         sourceMapCopy.set(key, { ...user, token: res.value.accessToken })
        //     }
        // })
    } catch (e) {
        console.warn("[addSourceToNode][addSourceToNode]", e);
    } finally {
        return sourceMapCopy;
    }
};

const addPostsToInbox = async ({ postArr, protectedQuery }) => {
    const postArrInbox = postArr.filter((p) => p.signatures.length > 1);
    console.log('postArrInbox[addPostsToInbox]', postArrInbox.length);
    // await Promise.allSettled(
    //     postArrInbox.map(async (p) => {
    //         const query = protectedQuery({ token: p.token });
    //         const mentionedUserAddress = p.destinationAddress;
    //         delete p.token;
    //         delete p.destinationAddress;
    //         await query.post(postApi.INBOX, { p, mentionedUserAddress });
    //     })
    // );
};

const addPostsToNode = async ({ postArr, protectedQuery }) => {
    try {
        // await addPostsToInbox({ postArr });
    } catch (e) {
        console.warn("addPostsToInbox]", e);
    }

    let resData,
        backOffTime = 100;
    for (let i = 0; i < postArr.length; i++) {
        let post = postArr[i];
        let path, data;
        const query = protectedQuery({ token: post.token });
        delete post.token;
        if (post.signatures.length === 2) {
            path = `${postApi.INBOX_UPDATE_STATE}`;
            const destinationAddress = post.destinationAddress;
            delete post.destinationAddress;
            data = {
                id: post.id,
                status: "accepted",
                destinationAddress,
                authorAddress: post.source.address,
                post,
            };
            console.log("WHAT DO i do HERE!!!!", post.signatures);
        } else {
            path = `${postApi.SEND_POST}`;
            data = { post, addToIndex: true, tags: [] };
            console.log("res[addPostResult]", i);
            // console.log("res[addPostResult]", data);
        }
        console.log("path[SEND POST]", path);
        try {
            ({ data: resData } = await query.post(path, data));
            console.log('data[query.post]', resData);
        } catch (e) {
            console.log('res[addPostResult][error]', e);
            backOffTime *= 2;
            i--;
            await delay(backOffTime);
        }
    }
};

module.exports = {
    addPostsToNode,
    addSourceToNode,
};

// postArr.map(async (post, i) => {
//     try {
//         await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] });
//         await sleep(2000);
//     }
//     catch (e) {
//         console.warn('[indexOne][addPostsToNode]', e);
//     }
// })

// try {
//     PromiseBird.map(postArr, post => {
//         console.log('post', post.type);
//         return axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] });
//     }).then(val => {
//         console.log({ val });
//     });

// } catch (err) {
//     console.log(err);
// }

// for (let i = 0; i < fileIds.length; i++) {
//     let fileId = fileIds[i];
//     await getFileName(fileId, auth)
//         .then((name) => {
//             // do some work
//         })
//         .catch((err) => {
//             // assumes that the error is "request made too soon"
//             backOffTime *= 2;
//             i--;
//             console.log(err);
//             return delay(backOffTime);
//         });
// }

/*     for (let i = 0; i < postArr.length; i++) {
            let post = postArr[i];
            await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] })
                .then((name) => {
                    // do some work
                })
                .catch((err) => {
                    console.log('res[][error]', i);

                    // assumes that the error is "request made too soon"
                    backOffTime *= 2;
                    i--;
                    console.log(err);
                    return delay(backOffTime);
                });
        } */

/*     try {
            const addPostResult = await Promise.allSettled(
                postArr.map(async (post, i) => {
                    let data;
                    try {
                        ({ data } = await axios.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] }));
                        console.log('res[addPostResult]', data);
                    } catch (e) {
                        console.log('res[addPostResult][error]', e);
                        data = ''
                    } finally {
                        return data
                    }
                    // await sleep(5000);
                })
            )

            console.log('addPostResult[addPostResult]', addPostResult);
        }
        catch (e) {
            console.warn('[addPostsToNode][Promise.allSettled]', e)
        } */
