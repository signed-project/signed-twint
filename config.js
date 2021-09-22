exports.credentials = {
    password: '111',
};

exports.host = {
    API_HOST: 'https://2poeme803i.execute-api.us-west-2.amazonaws.com',
    PUBLIC_API_TAG_HOST: 'https://uljlagwuji.execute-api.us-west-2.amazonaws.com/prod',
    PUBLIC_API_INDEX_HOST: 'https://ph04gkkcyd.execute-api.us-west-2.amazonaws.com/prod'
}

exports.publicApi = {
    HOST_ASSETS: "/public/file_storage",
}

exports.inboxApi = {
    INBOX: '/inbox',
    INBOX_UPDATE_STATE: '/inbox/update',
};

exports.userApi = {
    REGISTER: '/register',
    CHECK_LOGIN: '/register/checkLogin',
    LOGIN_EXCHANGE_EPHEMERAL_KEYS: '/login/exchangeEphemeralKeys',
    LOGIN_SESSION_PROOF: '/login/validateSessionProofs',
    LOGIN_GET_USER_TOKEN: '/login/getUserToken',
    GET_USER: '/user',
    GET_TOKEN_PAIR: '/tokens-pair',
    SUBSCRIBED: '/subscribed',
    UPDATE_USER: '/user/update',
    FOLLOW_USER: '/user/follow',
};


exports.postApi = {
    SEND_POST: "/post",
};