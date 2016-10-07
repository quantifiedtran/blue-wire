'use babel';
import { bluewire, createRequest, createEntry } from './blue-wire-model';
import { CompositeDisposable } from 'atom';
import $ from 'jquery';
import _ from 'underscore';

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

/**
    Time pretty-printer, does minutes and seconds.
*/
function ppseconds(rawSeconds) {
    let seconds = rawSeconds % 60;
    let minutes = (rawSeconds - seconds) / 60;
    return "minutes: " + Math.ceil(minutes) + ", seconds: " + Math.ceil(seconds);
}

function isDate(maybeDate) {
    return !!(new Date(maybeDate).toJSON());
}

export default {
    subscriptions: null,
    pollKicks: function() {},
    config: {
        address: {
            title: "Blue-wire server address",
            type: "string",
            default: "http://127.0.0.1:8080",
        }
    },
    bluewireInterface: null,

    activate(state) {
        let config = atom.config.get("blue-wire");
        let appname = "text-editor";
        let bw = bluewire(config, appname);

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'blue-wire:pollKicks': () => this.pollKicks()
        }));
        atom.notifications.addInfo("Initialised blue-wire!");

        this.pollKicks = () => {
        };
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {
        return {};
    },

};
