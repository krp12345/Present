# History

## All visible records are listed

Given records have been saved
When the history screen is shown
Then each record that has not been deleted is listed

## Record description tags and time can be edited

Given a record is opened from history
When its description, tags, or time are changed to valid values
And save is requested
Then the listed record shows the new values

## Future time is rejected when editing

Given a record is opened from history
When its time is set to the future
And save is requested
Then the change is not saved

## Records can be filtered by tag

Given records with different tags exist
When history is filtered to one tag
Then only records with that tag are listed

## Records can be filtered by time range

Given records with different times exist
When history is filtered to a time range
Then only records in that range are listed

## Deleting a record asks for confirmation

Given a record is shown in history
When deletion is requested
Then a confirmation is shown
And the record stays listed until the deletion is confirmed

## Deleted record is not listed

Given deletion of a record has been confirmed
When history is shown
Then that record is not listed

## Save is refused if the record changed elsewhere

Given a record is open for edit on one device
And the same record has been saved from another device since it was opened
When save is requested on the first device
Then the save is refused
And the user is told to look at the latest record
