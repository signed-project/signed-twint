const axios = require("axios");
const { host } = require("../config");


class Query {
    constructor(data) { }


    set setToken(token) {
        this.data.token = token;
    }

    get publicQuery() {
        const query = axios.create({
            baseURL: host.API_HOST,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });
        return query
    }
    get protectedQuery() {
        const query = axios.create({
            baseURL: host.API_HOST,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.data.token}`,
            }
        });
        return query
    }


}


module.exports = {
    Query: Query
}