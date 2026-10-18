# Discovery UI prototype

Question: which information hierarchy and layout best fit the signed-in discovery
home, while keeping search and personal game lists easy to reach?

Open `index.html` directly in a browser. No installation, server, credentials, or
network access is needed; the included assets are downloaded public IGDB artwork
and metadata. Use the bottom arrows or the keyboard's left/right arrows to switch:

- `?variant=A`: cinematic spotlight with cover shelves.
- `?variant=B`: editorial feature with a ranked list and an indie shelf.
- `?variant=C`: sidebar dashboard with a compact spotlight and discovery cards.
- `?variant=D`: hybrid of A's cinematic hero and C's sidebar/dashboard structure.

Try game details, Want to play, My Library, changing a status, the combined Played
view, removing a game, and searching the six-title sample. State stays in memory
across variants and resets on reload. The working name is Sidequest; the owner has
not selected an application name.

Collections are sample layouts, not current release dates or live popularity
rankings. No real account, API, or persistent-storage implementation is included.
The prototype is plain HTML/CSS/JS; the production stack remains Angular/NestJS.

Validation: JavaScript syntax check, desktop and mobile render inspection, browser
interaction check for save/status/search/library/dialog/variant flows, and a 390px
overflow check for all four layouts passed. The hybrid's desktop render was also inspected.

Await user feedback before promoting any design. After a direction is agreed,
preserve the prototype on a dedicated throwaway Git branch and record the verdict
on the planning ticket; rewrite production code under the agreed application stack.

Selected direction: D, with C's purple palette. The user accepted this direction
and requested moving on to the specification. Preserve on `prototype/game-discovery`.

Artwork and metadata source: https://www.igdb.com/
