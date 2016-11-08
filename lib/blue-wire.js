'use babel';
import { bluewire, createRequest, createEntry, fromEither } from './blue-wire-model';
import { CompositeDisposable } from 'atom';
import bluewire3 from './blue-wire-servant';
import $ from 'jquery';
import _ from 'underscore';
import leftPad from 'left-pad';

/**
    A throttled function that runs onces every minute, throwing up warnings
    that a kick is going to happen soon.
*/
let alertSoonKicks = _.throttle(
      (kicks) => {
          kicks.forEach((kick) => {
		let message = "Kick upcoming in: " + ppseconds(kick.timeUntilKick);
          let options = {
              description: "The kick would last " + ppseconds(kick.kickWouldLast) + ", but may be summed with other kicks that occur at the same time."
          };
		atom.notifications.addInfo(message, options);
	});
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
        // all kicks sooner than 2 mins from now. (the api returns seconds)
        (kick) => kick.timeUntilKick < (60 * 2)
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

function heartbeat(response) {
    fromEither(heartbeatKick, heartbeatCountdown, response);
}

function seconds(rawSeconds) {
    return Math.ceil(rawSeconds % 60);
}

function minutes(rawSeconds) {
    return Math.ceil((rawSeconds - seconds(rawSeconds)) / 60);
}

function hours(rawSeconds) {
    let mins = minutes(rawSeconds);
    return Math.ceil((mins - (mins % 60)) / 60) ;
}

function ppseconds(rawSeconds) {
    let hrs = hours(rawSeconds);
    let mins = minutes(rawSeconds) % 60;
    let secs = seconds(rawSeconds);
    return hrs + "h, " + mins + "m, " + secs + "s";
}

function isDate(maybeDate) {
    return !!(new Date(maybeDate).toJSON());
}

export default {
    subscriptions: null,
    pollKicks: function() {},
    keepRunning: true,
    config: {
        address: {
            title: "Blue-wire server address",
            type: "string",
            default: "http://localhost:8080",
        }
    },
    bluewireInterface: null,

    activate(state) {
        const config = atom.config.get("blue-wire");
        const appname = "text-editor";
        const bw = bluewire3(config);
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'blue-wire:pollKicks': () => this.pollKicks()
        }));
        bw.getConfig(
            (serverConfig) => {
                if (serverConfig && serverConfig.thisIsABlueWireServer) {
                    let interval = 1000; // (serverConfig.timeout / 10) * 1000;
                    let recurseHeartbeat = () => {
                        if (this.keepRunning) {
                            // Keep running the heartbeat.
                            bw.postAppByApplicationHeartbeat(
                                appname,
                                heartbeat,
                                () => atom.notifications.addError("Could not heartbeat \'" + appname + "\'"));
                            setTimeout(recurseHeartbeat, interval + ((Math.random() * 400) - 200));
                        }
                        // If blue-wire has been asked to stop running, close the editor.
                        else atom.close();
                    };

                    this.pollKicks = () => {
                        bw.getAppByApplicationKicks(appname,
                            (response) => {
                                // Generate the table to show the kicks
                                const pad = 20;
                                let kicks = response;
                                let header = leftPad("Time until", pad) + "|Duration";
                                let messages = kicks.map((kick) => {
                                    return leftPad(ppseconds(kick.countdown), pad) + "|"
                                                 + ppseconds(kick.duration);
                                });
                                let final = messages.reduce((mess, elem) => {
                                    return mess + "\n" + elem;
                                }, "``` \n" + header) + "\n```";
                                // Generate the notification.
                                atom.notifications.addInfo("Upcoming kick info", {description: final, dismissable: true});
                        }, () => atom.notifications.addError("Couldn't get kicks from blue-wire"));
                    };

                    setTimeout(recurseHeartbeat, interval);
                } else {
                    // The server isn't a blue-wire server, throw an error.
                    atom.notifications.addError("Contacted a server at the given address but it wasn't a blue-wire server.");
                }
            },
            () => atom.notifications.addError("Could not reach blue-wire server.")

        );
    },

    oldactivate(state) {
        let config = atom.config.get("blue-wire");
        let appname = "text-editor";
        let bw = bluewire(config, appname);
        let sconfig = bw.serverConfig();

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'blue-wire:pollKicks': () => this.pollKicks()
        }));

        // Method for getting and displaying the current kicks.
        this.pollKicks = () => {
            bw.getKicks(
                (jqxhr, text, err) => {
                    // Couldn't get the kicks, display an error notification.
                    atom.notifications.addError("Couldn't get kicks from blue-wire", {detail: err, description: text});
                },
                (response) => {
                    // Generate the table to show the kicks
                    const pad = 20;
                    let kicks = response.kicks;
                    let header = leftPad("Time until", pad) + "|Duration";
                    let messages = kicks.map((kick) => {
                        return leftPad(ppseconds(kick.countdown), pad) + "|"
                                     + ppseconds(kick.duration);
                    });
                    let final = messages.reduce((mess, elem) => {
                        return mess + "\n" + elem;
                    }, "``` \n" + header) + "\n```";
                    // Generate the notification.
                    atom.notifications.addInfo("Upcoming kick info", {description: final, dismissable: true});
                },
                true
            );
        };

        let beatTime = (sconfig.timeout * 1000) / 10;

        let recurseHeartbeat = () => {
            if (this.keepRunning) {
                bw.heartbeat(() => {
                    atom.notifications.addError("Could not contact blue-wire server for heartbeat");
                }, heartbeatKick, heartbeatCountdown, true);
                setTimeout(recurseHeartbeat, beatTime);
            }
            else {
                atom.close();
            }
        };

        setTimeout(recurseHeartbeat, beatTime);
    },

    deactivate() {
        this.subscriptions.dispose();
        this.keepRunning = false;
    },

    serialize() {
        return {};
    },

};
