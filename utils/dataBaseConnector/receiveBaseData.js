

const getUsersData = async ({ sources }) => {
    const sourcesMap = mapFromArr({ arr: sources, keyName: 'publicName' });
    const dataBaseUserMap = new Map();

    const resultData = await Promise.allSettled(
        sources.map(async (s) => {
            try {
                ({ data } = await axios.post(`${host.API_HOST}${userApi.GET_USER}`, { userName: s.publicName }));
                return data;
            } catch (e) {
                console.warn("[getIndexSaga][getAllHostsIndex]", e);
            }
        })
    )
    resultData.map(data => {
        if (data.status === 'fulfilled' && data?.value?.encryptedWif && data?.value?.userName) {
            const userInstance = new User({});
            userInstance.setUserData = {
                encryptedWif: data.value.encryptedWif,
                userName: data.value.userName,
                source: sourcesMap.get(data.value.userName)
            };
            const user = userInstance.newDataBaseUser;
            dataBaseUserMap.set(user.userName, user);
        }
    })
    return dataBaseUserMap;
}

const getAllHostsIndex = async ({ axios }) => {
    let data;
    try {
        ({ data } = await axios.get(`${host.API_HOST}${userApi.SUBSCRIBED}`));
    } catch (e) {
        console.warn("[getIndexSaga][getAllHostsIndex]", e);
    }

    try {
        const { gatheredPosts, hostSources } = await getSubscribedIndex({
            subscribed: data,
        });
        return { gatheredPosts, hostSources };
    } catch (e) {
        console.warn("[getIndexSaga][getAllHostsIndex][getSubscribedIndex]", e);
        return [];
    }
};


const getSubscribedIndex = async ({ subscribed }) => {
    let postSubscribed = [],
        gatheredPosts = [],
        hostSources = [];
    try {
        await Promise.allSettled(
            subscribed.map(async (sbs) => {
                await Promise.allSettled(
                    sbs.hosts.map(async (hst) => {
                        let res = await axiosLib.get(`${hst.index}`);
                        if (res?.data?.index) {
                            postSubscribed.push(res?.data?.index);
                        }
                        if (res?.data?.source) {
                            hostSources.push(res?.data?.source);
                        }
                        return;
                    })
                );
            })
        );
    } catch (e) {
        console.warn("[getSubscribedIndex][Promise.all]", e);
    }

    try {
        postSubscribed.map((posts) => {
            gatheredPosts = [...gatheredPosts, ...posts];
            return posts;
        });
    } catch (e) {
        console.warn("[getSubscribedIndex][gatheredPosts]", e);
    }

    return { gatheredPosts, hostSources };
};