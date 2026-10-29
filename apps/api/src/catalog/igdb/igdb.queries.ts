/** The same scope rule, in IGDB's query language, so IGDB filters first. */
export const SCOPE_FILTER =
  'game_type = (0,8,9) & version_parent = null & (platforms.platform_type = (1,5,6) | platforms = (3,6,14))';

/** The IGDB fields that toCatalogGame reads. */
export const GAME_FIELDS =
  'name,game_type,version_parent,cover.image_id,first_release_date,' +
  'platforms.name,platforms.platform_type,summary,genres.name,' +
  'involved_companies.developer,involved_companies.publisher,involved_companies.company.name';

export const FEED_FIELDS = `${GAME_FIELDS},artworks.image_id`;
