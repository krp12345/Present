# Login

## Sign-in is the only launch screen

Given the app has just been opened
And nobody is signed in on this device
When the first screen is shown
Then the only action available is signing in
And nothing else about the rest of the app is shown

## The owner's account opens the app

Given the sign-in screen is shown
When the owner signs in with their account
Then the log-the-moment screen is shown

## Any other account is denied

Given the sign-in screen is shown
When someone signs in with an account that is not the owner's
Then access is denied
And no records or tags are shown
And they can sign out to try another account

## A denied account cannot read or change anything

Given an account that is not the owner's is signed in
When it tries to read or change records or tags by any means
Then nothing is read and nothing is changed

## After one hour the user is returned to sign-in

Given the app has been opened by signing in
When one hour has passed since that sign-in
Then the sign-in screen is shown
And the user must sign in again to continue

## Unfinished work is discarded when forced out

Given the log-the-moment screen is shown
And the user has typed a description or chosen tags that are not saved
When one hour since sign-in has passed
Then the sign-in screen is shown
And those unsaved changes are gone

## Lock returns to sign-in

Given the app is open
When the user chooses to lock it
Then the sign-in screen is shown

## Phone and PC may be open at the same time

Given the app is already open on one device
When the owner signs in on a second device
Then the app opens on the second device
And the first device remains open
