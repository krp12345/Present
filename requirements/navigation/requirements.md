# Navigation

## After unlock the log the moment screen is shown

Given the key entry screen is shown
And access is not blocked
When the correct key is submitted
Then the log-the-moment screen is shown first

## Side menu lists history and tag management

Given the log-the-moment screen is shown
When the small control that opens the side menu is used
Then a menu appears from the left
And it lists history
And it lists tag management

## History is not on the log the moment screen

Given the log-the-moment screen is shown
When the screen is viewed without opening the side menu
Then the list of past records is not shown
