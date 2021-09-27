const { host, userApi, postApi } = require("../../config");

const delay = ms => new Promise(res => setTimeout(res, ms));

const addSourceToNode = async ({ sourceMap, query }) => {

    try {
        await Promise.allSettled(
            Array.from(sourceMap,
                async ([key, user]) => {
                    const data = {
                        salt: user.salt,
                        verifier: user.verifier,
                        userName: user.userName,
                        address: user.source.address,
                        encryptedWif: user.encryptedWif,
                        source: user.source,
                    };
                    await query.post(`${userApi.REGISTER}`, data);
                }));
    }
    catch (e) {
        console.warn('[addSourceToNode][addSourceToNode]', e);
    }
}



const addPostsToNode = async ({ postArr, query }) => {
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
    let backOffTime = 100;
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


    for (let i = 0; i < postArr.length; i++) {
        let post = postArr[i];
        try {
            ({ data } = await query.post(`${postApi.SEND_POST}`, { post, addToIndex: true, tags: [] }));
            console.log('res[addPostResult]', i);
            console.log('res[addPostResult]', data);
        }
        catch (e) {
            console.log('res[addPostResult][error]', e);
            backOffTime *= 2;
            i--;
            await delay(backOffTime);
        }
    }


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
}

module.exports = {
    addPostsToNode,
    addSourceToNode
}