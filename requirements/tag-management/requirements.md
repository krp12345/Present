# Tag management

## New tag can be added

Given the tag management screen is shown
When a new tag name within the length limit is added
Then that tag appears on the pick list

## Tag name can be renamed

Given a tag exists
When its name is changed to a new unused name within the length limit
Then the pick list shows the new name
And records that used that tag show the new name

## Removing a tag asks for confirmation

Given a tag exists
When removal of that tag is requested
Then a warning is shown
And the tag stays available until the warning is confirmed

## Removed tag is not on the pick list

Given a tag has been removed after confirmation
When a tag is being picked for a record
Then that tag is not offered

## Obsolete tag on a record is marked

Given a record still has a tag that was later removed
When that record is shown
Then the tag is visible
And it is marked so it is clear the tag is obsolete

## Adding a removed tag name re-enables it

Given a tag was removed
When a tag is added with the same name
Then that tag is available on the pick list again
And there is still only one tag with that name

## Two tags cannot share the same name

Given a tag already exists with a name
When another tag is added or renamed to that same name
Then the change is not accepted
And there are not two tags with that name
