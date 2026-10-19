import { baldursGate } from './igdb.js';

const failed = new Set<string>();
const unknown = {
  id: 1010,
  name: 'Little-known game',
  game_type: 0,
  platforms: [{ id: 130, name: 'Nintendo Switch', platform_type: 1 }],
};

export const browserIgdbFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === 'id.twitch.tv')
    return Response.json({
      access_token: 'browser-fixture-token',
      expires_in: 3600,
    });
  const body = String(init?.body ?? '');
  const match = /search ("(?:[^"\\]|\\.)*");/.exec(body);
  const query = match ? String(JSON.parse(match[1])) : '';
  await new Promise((resolve) =>
    setTimeout(resolve, query.startsWith('Superseded') ? 1500 : 350),
  );
  if (url.pathname.endsWith('/popularity_primitives'))
    return Response.json([
      { game_id: 119171, value: 1, popularity_type: 1 },
      { game_id: 1010, value: 0.5, popularity_type: 1 },
    ]);
  if (body.includes('where id = ('))
    return Response.json([
      { ...baldursGate, artworks: [{ image_id: 'cinematic_art' }] },
      unknown,
    ]);
  if (body.includes('sort first_release_date desc'))
    return Response.json([
      {
        ...baldursGate,
        first_release_date: Math.floor(Date.now() / 1000) - 86400,
      },
      {
        ...unknown,
        first_release_date: Math.floor(Date.now() / 1000) - 2 * 86400,
      },
    ]);
  if (body.includes('where id = 119171')) return Response.json([baldursGate]);
  if (body.includes('where id = 1010')) return Response.json([unknown]);
  if (body.includes('where id = ')) return Response.json([]);
  if (query.startsWith('Empty')) return Response.json([]);
  if (query.startsWith('Retry') && !failed.has(query)) {
    failed.add(query);
    return Response.json({ message: 'fixture outage' }, { status: 503 });
  }
  if (query.startsWith('Unknown')) return Response.json([unknown]);
  if (/offset 12;/.test(body))
    return Response.json([{ ...baldursGate, id: 3012, name: 'Page two game' }]);
  return Response.json([
    baldursGate,
    ...Array.from({ length: 12 }, (_, index) => ({
      ...baldursGate,
      id: 3000 + index,
      name: `Adventure ${index + 1}`,
    })),
  ]);
};
