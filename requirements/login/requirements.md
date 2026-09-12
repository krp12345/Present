# Login

## Key entry is the only launch screen

Given the app has just been opened
When the first screen is shown
Then the only action available is entering the key
And nothing else about the rest of the app is shown

## Correct key opens the app

Given the key entry screen is shown
And access is not blocked
When the correct key is submitted
Then the log-the-moment screen is shown

## Empty or wrong key is denied with tries remaining

Given the key entry screen is shown
And access is not blocked
When an empty key or a wrong key is submitted
Then access is denied
And how many tries remain is shown

## Empty and wrong key both count as attempts

Given the key entry screen is shown
And no failed attempts have been made yet
When an empty key is submitted
And then a wrong key is submitted
Then two attempts have been used
And the remaining try count reflects both

## Five failed attempts block further access

Given four failed unlock attempts have already been made
When a fifth empty or wrong key is submitted
Then access is denied
And further unlock attempts are blocked until the block is explicitly cleared

## Blocked user cannot open the app

Given unlock attempts from this place are blocked
When the correct key is submitted
Then the app does not open

## Successful unlock resets failed attempts

Given some failed unlock attempts have been made
And access is not yet blocked
When the correct key is submitted
Then the app opens
And later failed attempts start from a full set of five tries again

## After one hour the user is returned to key entry

Given the app has been opened with a correct key
When one hour has passed
Then the key entry screen is shown
And the user must enter the key again to continue

## Unfinished work is discarded when forced out

Given the log-the-moment screen is shown
And the user has typed a description or chosen tags that are not saved
When one hour since unlock has passed
Then the key entry screen is shown
And those unsaved changes are gone

## Phone and PC may be open at the same time

Given the app is already open on one device
When the correct key is submitted on a second device
Then the app opens on the second device
And the first device remains open

## Block lasts until it is explicitly cleared

Given unlock attempts from this place are blocked
When the app is later opened again after the server has been restarted
Then access is still blocked
And the block remains until it is explicitly cleared
