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
function createRequest(url, data, type, onFail, onSucceed) {
    $.ajax({
        url: url,
        data: data,
        type: type,
        success: onSucceed,
        error: onFail,
    });
}

function ppseconds(rawSeconds) {
    let seconds = rawSeconds % 60;
    let minutes = (rawSeconds - seconds) / 60;
    return "minutes: " + Math.ceil(minutes) + ", seconds: " + Math.ceil(seconds);
}

/**
    A throttled function that runs onces every minute, throwing up warnings
    that a kick is going to happen soon.
*/
let alertSoonKicks = _.throttle(

      (kicks) => {
          let message = "Kick upcoming in: " + ppseconds(kick.timeUntilKick);
          let options = {
              description: "The kick would last " + ppseconds(kick.kickDuration) + ", but may be summed with other kicks that occur at the same time."
          };
          kicks.forEach(
              (kick) => atom.notifications.addInfo(message, options)
          );
      }
    , 60 * 1000 // this can be called once every minute.
);

/**
    Function to run when the response to a heartbeat is that
    there are upcoming kicks.
*/
function heartbeatCountdown(countdownInfo) {
    const upcomingKicks = countdownInfo.upcomingKicks;
    let soonKicks = upcomingKicks.filter(
        // all kicks sooner than 10 mins from now. (the api returns seconds)
        (kick, _a, _b) => kick.timeUntilKick < (60 * 6)
    );
    alertSoonKicks(soonKicks);
}
/**
    Function to run when the response to a heartbeat is that
    there's a kick that's
*/
function heartbeatKick(kickInfo) {
    const kickEndsOn = new Date(kickInfo.kickEndsOn);
    let message =
        "No more working!\n"
        + "You've run out of time to work, blue-wire will kick you immenently.\n"
        + "The current kick ends at: " + kickEndsOn;
    alert(message);
    // Close the editor once the alert is closed.
    atom.close();
}

function isDate(maybeDate) {
    return !!(new Date(maybeDate).toJSON());
}

/**
    Create an entry on the blue-wire database.
*/
function createEntry(name, kicks, regain, addr) {
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
    createRequest(url, entry, "POST"
     , (jqxhr, status, error) => { // Failure callback
         atom.notifications.addError(status, {description: error + ". URL was " + url, detail: JSON.stringify(jqxhr), dismissable: true});
    }, (response, status, jqxhr) => { // Success callback
        atom.notifications.addInfo("Created app with the name: " + name, {});
    });

}

function bluewire(config, appname) {
    let hbURL = config.address + "/heartbeat/" + appname;
    let getKicksURL = config.address + "/get/" + appname + "/kicks";
    return {
        heartbeat() {
            $.post(
                  hbURL
                , "" // Passing no data.
                , (response) => {
                    fromEither(heartbeatKick, heartbeatCountdown, response);
                }
                , "json"
            );
        },
        createNewEntry(name, kicks, regain) {
            createEntry(name, kicks, regain, config.address);
        },
        // Function gets called on the response
        getKicks(callback) {
            $.get(
                getKicksURL,
                {},
                callback,
                "json"
            );
        }
    };
}

export default {
    bluewire: bluewire,
    createEntry: createEntry,
    createRequest: createRequest,
};
