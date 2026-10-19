export const pc = { id: 6, name: 'PC (Microsoft Windows)', platform_type: 4 };
export const consolePlatform = {
  id: 130,
  name: 'Nintendo Switch',
  platform_type: 1,
};
export const baldursGate = {
  id: 119171,
  name: "Baldur's Gate III",
  game_type: 0,
  platforms: [pc],
  cover: { image_id: 'co670h' },
  first_release_date: 1691020800,
  summary: 'Gather your party and return to the Forgotten Realms.',
  genres: [{ id: 12, name: 'Role-playing (RPG)' }],
  involved_companies: [
    {
      developer: true,
      publisher: true,
      company: { id: 57, name: 'Larian Studios' },
    },
  ],
};

// The only replacement is the external Twitch/IGDB HTTP boundary.
// Tests still run the real NestJS controllers, sessions, PostgreSQL, and migrations.
export class IgdbFixture {
  requests: { endpoint: string; body: string; at: number }[] = [];
  games: unknown[] = [baldursGate];
  popularity: unknown[] = [];
  status = 200;
  rejectedTokens = 0;
  responseBody: unknown = undefined;
  delayMs = 0;
  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    this.requests.push({
      endpoint: url.pathname.split('/').at(-1)!,
      body: String(init?.body ?? ''),
      at: performance.now(),
    });
    if (url.hostname === 'id.twitch.tv')
      return Response.json({
        access_token: 'fixture-server-only-token',
        expires_in: 3600,
      });
    if (this.rejectedTokens > 0) {
      this.rejectedTokens--;
      return Response.json({}, { status: 401 });
    }
    if (this.delayMs)
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.status !== 200)
      return Response.json(
        { message: 'Private provider diagnostics: fixture-server-only-token' },
        { status: this.status, headers: { 'Retry-After': '1' } },
      );
    if (url.pathname.endsWith('/popularity_primitives'))
      return Response.json(this.responseBody ?? this.popularity);
    return Response.json(this.responseBody ?? this.games);
  };
}
