# Authentication

## Static key

One configured secret for all devices. It is username and password combined. It does not expire. Changing it is a server configuration concern, not an in-app flow.

There is no username field.

Unlock: the client sends the static key in an HTTPS request header. Missing and incorrect values are the same class of failure: unauthorized, and they increment the failure count. Keys are not sent over HTTP (HTTP is not served).


## Temporary key

On success, the server returns a unique temporary key. Later HTTPS requests send that temporary key in a header. The server rejects work if it is missing, wrong, or older than one hour.

Lifetime is one hour from issue. When it expires, the client is treated as logged out. Anything not saved is discarded. The user must unlock again with the static key.

Each successful unlock may issue its own temporary key so two devices can work at once.

## Failure counting and lockout

Failures are counted per client identity suitable for lockout (IP, and another unique id if IP is not enough). Empty key and wrong key both count, so a client cannot keep hitting the server without using up tries.

Five failures are allowed. A further failure while already at five leaves the identity blocked.

A successful unlock resets that identity’s failure count.

A blocked identity stays blocked across process restart. Clearing a block in this slice is a manual change in the persistent store by the operator, not an in-app action and not a side effect of restart.

## Visible unlock behaviour

Failed unlock: generic denial plus how many tries remain.

Blocked: cannot open the app, including with the correct static key, until the operator clears the block.
