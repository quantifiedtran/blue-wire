"use babel";
import $ from 'jquery';
import _ from 'underscore';

/**
    @callback onLeft
    @callback onRight
*/
function fromEither(onLeft, onRight, response) {
    if (response.Left) {
        // Pass the left value to the function expecting it.
        return onLeft(response.Left);
    }
    else if (response.Right) {
        // Pass the right value to the function expecting it.
        return onRight(response.Right);
    }
    else {
        // Invalid input!
        console.log("invalid input for fromEither:", response);
        return null;
    }
}

/**
    Send an AJAX request
*/
function createRequest(url, data, type, onFail, onSucceed, isAsync) {
    isAsync = isAsync || false;
    return $.ajax({
        async: isAsync,
        url: url,
        data: data,
        type: type,
        success: onSucceed,
        error: onFail,
    });
}

/**
    Create an entry on the blue-wire database.
*/
function createEntry(name, kicks, regain, addr, onFail, onSucceed) {
    const url = addr + "/new";
    const now = new Date();
    let entry = JSON.stringify(
        { name: name
        , activeKicks: kicks
        , lastHeartbeat: now
        , recoveryRate: regain.rate
        , recoveryHurdle: regain.hurdle
        , maxRecovery: regain.maximum
        , canNextSetKicks: now
    });
    createRequest(url, entry, "POST", onFail, onSucceed);

}

function bluewire(config, appname) {
    return {
        heartbeat(onFail, onKick, onCountdown, isAsync) {
            let url = config.address + "/heartbeat/" + appname;
            return createRequest(url, "", "POST", onFail, (response, _1, _2) => {
                fromEither(onKick, onCountdown, response);
            }, isAsync);
        },
        createNewEntry(name, kicks, regain, isAsync) {
            return createEntry(name, kicks, regain, config.address, isAsync);
        },
        // Function gets called on the response
        getKicks(onFail, onSucceed, isAsync) {
            let url = config.address + "/get/" + appname + "/kicks";
            return createRequest(url, "", "GET", onFail, onSucceed, isAsync);
        },

        setKicks(kicks, onFail, onSucceed) {
            // TODO
        },

        sanityCheck() {
            let sConfig = this.serverConfig();
            return (sConfig && sConfig.thisIsABlueWireServer);
        },

        serverConfig() {
            let sConfig = null;
            let url = config.address + "/config";
            createRequest(url, "", "GET", () => {}, (data) => sConfig = data, false);
            return sConfig;
        }
    };
}

export default {
    bluewire: bluewire,
    createEntry: createEntry,
    createRequest: createRequest,
};
