# Note present

## Record requires at least one tag

Given the log-the-moment screen is shown
When save is requested with no tag
Then the record is not saved

## Description is optional

Given the log-the-moment screen is shown
And at least one tag is chosen
When save is requested with an empty description
Then the record is saved

## Record may have more than one tag

Given the log-the-moment screen is shown
When more than one tag is chosen
And save is requested
Then the record is saved with all chosen tags

## Existing tag can be picked while logging

Given a tag already exists
And the log-the-moment screen is shown
When that tag is picked
And save is requested
Then the record is saved with that tag

## New tag can be created while logging

Given the log-the-moment screen is shown
When a new tag name is created there
And save is requested
Then the record is saved with that tag
And the tag is available later on the pick list

## Time defaults to now

Given the log-the-moment screen is shown
And the user has not set a time
When the record is saved
Then the record’s time is the moment it was saved

## Past time may be set

Given the log-the-moment screen is shown
When a time in the past is set
And the record is saved
Then the record keeps that past time

## Future time is rejected

Given the log-the-moment screen is shown
When a time in the future is set
And save is requested
Then the record is not saved

## Times are shown and entered in device local time

Given the log-the-moment screen is shown
When a time is shown or entered
Then it matches the local time on the device being used

## Description longer than one thousand characters is rejected

Given the log-the-moment screen is shown
And at least one tag is chosen
When the description is longer than 1000 characters
And save is requested
Then a validation error is shown
And the record is not saved

## Tag name longer than two hundred characters is rejected

Given a tag name is being entered
When the name is longer than 200 characters
Then a validation error is shown
And that name is not accepted as a tag

## Description count appears after nine hundred characters

Given a description is being typed
When its length exceeds 900 characters
Then the current count and the maximum of 1000 are shown

## Tag name count appears after one hundred ninety characters

Given a tag name is being typed
When its length exceeds 190 characters
Then the current count and the maximum of 200 are shown

## Character counts are hidden below the thresholds

Given a description of at most 900 characters
And a tag name of at most 190 characters
When those fields are shown
Then the character counts are not shown

## Unicode text is accepted

Given the log-the-moment screen is shown
When a description and a tag name use characters that are not English letters
And the lengths are within the limits
And at least one tag is attached
And save is requested
Then the record is saved with that text unchanged

## After save the record is shown and can be edited

Given a record has just been saved from the log-the-moment screen
When the save completes
Then that record is shown
And its description and tags can be edited
