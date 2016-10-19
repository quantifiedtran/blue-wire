# blue-wire

## A self-destruct for unhealthy work patterns

*12 hour work days, text editor always open in the background, always working on something - this isn't healthy.*

This is an atom frontend for [blue-wire](https://github.com/quantifiedtran/blue-wire-backend), a server whose purpose is to monitor how long different programs have been open and alert them if they've been open too long and the user should take a break.

This is a strict implementation, you go over on time and an alert will pop up and the text editor will close every time it's opened until the break is over.
