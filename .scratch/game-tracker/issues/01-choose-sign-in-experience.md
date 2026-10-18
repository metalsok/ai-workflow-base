# Choose how friends sign in

Type: grilling
Status: resolved
Blocked by: none

## Question

Should testers create accounts directly in the game application, or is requiring
ChatGPT sign-in acceptable? Resolve the intended user experience before choosing
authentication and hosting tools.

The inspected Sites hosting guidance provides ChatGPT sign-in. An independent
account experience requires a separate implementation approach to be evaluated;
no hosting provider or authentication service has been selected.

## Comments

Individual accounts and private per-user lists are already agreed. This question
is about how people establish those accounts, not whether accounts are needed.

## Answer

Users must have independent email accounts in the application, without coupling
to ChatGPT. The owner explicitly confirmed this requirement.

The Sites-hosted ChatGPT sign-in approach does not meet this requirement and is
excluded. Email account mechanics and the implementation/hosting provider remain
to be evaluated; choosing email accounts does not yet choose passwords or email links.
