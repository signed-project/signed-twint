const axios = require("axios")
const { mapFromArr } = require('../generateData')
const { User } = require('../../models/user')
const { host, userApi, postApi } = require("../../config");

// 
const getUsersData = async ({ sources, query }) => {
    console.log('----------1--------------');
    const sourcesMap = mapFromArr({ arr: sources, keyName: 'publicName' });
    const dataBaseUserMap = new Map();

    const resultData = await Promise.allSettled(
        sources.map(async (s) => {
            const { data } = await query.post(`${userApi.GET_USER}`, { userName: s.publicName });
            console.log(data);
            return data;
        })
    );
    console.log('----------2--------------')
    resultData.map(data => {
        if (data.status === 'fulfilled' && data?.value?.encryptedWif && data?.value?.userName) {
            console.log('New user')
            const userInstance = new User({});
            console.log('setUserData')
            userInstance.setUserData = {
                encryptedWif: data.value.encryptedWif,
                userName: data.value.userName,
                source: sourcesMap.get(data.value.userName),
                token: data.value.accessToken
            };
            console.log('dataBaseUserMap.set')
            const user = userInstance.newDataBaseUser;
            console.log('dataBaseUserMap.set')
            dataBaseUserMap.set(user.userName, user);
        }
    })
    console.log('----------3--------------', dataBaseUserMap.size)
    return dataBaseUserMap;
}



// Load all indexes and archives
const getSubscribedIndex = async ({ subscribed }) => {
    let postSubscribed = [],
        gatheredPosts = [],
        hostSources = [];

    await Promise.allSettled(
        subscribed.map(async (sbs) => {
            await Promise.allSettled(
                sbs.hosts.map(async (hst) => {
                    try {
                        console.log('Fetching ' + hst.index)
                        const res = await axios.get(hst.index);
                        // console.log(res.data);
                        if (res?.data?.source) {
                            console.log('Got ' + res.data.source.publicName + " source")
                            hostSources.push(res.data.source);
                        }
                        if (res?.data?.index) {
                            console.log('Got ' + res.data.index.recentPosts.length + ' items');
                            postSubscribed.push(res.data.index.recentPosts);
                            // TODO: fetch archives as well
                        }
                        
                    } catch (e) {
                        console.log('[getSubscribedIndex]', e);
                    }
                })
            );
        })
    );

    postSubscribed.map((posts) => {
        if (!Array.isArray(posts)) {
            posts = []
        }
        gatheredPosts = [...gatheredPosts, ...posts];
        return posts;
    });


    return { gatheredPosts, hostSources };
};


const getAllHostsIndex = async ({ query, host, userApi }) => {
    const url = `${host.API_HOST}${userApi.SUBSCRIBED}`;
    console.log('Getting ' + url);
    const { data } = await query.get(url);
    console.log('Fetching indexes from the server')
    const { gatheredPosts, hostSources } = await getSubscribedIndex({
        subscribed: data,
        query
    });
    console.log('Fetched ' + gatheredPosts.length + ' posts from the server');
    return { gatheredPosts, hostSources };
};


module.exports = {
    getAllHostsIndex,
    getUsersData
}