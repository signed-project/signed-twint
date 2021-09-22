




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