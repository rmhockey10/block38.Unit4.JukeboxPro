import db from "#db/client";

import { createPlaylist } from "#db/queries/playlists";
import { createPlaylistTrack } from "#db/queries/playlists_tracks";
import { createTrack } from "#db/queries/tracks";
import { createUser } from "#db/queries/users";

await db.connect();
await seed();
await db.end();
console.log("🌱 Database seeded.");

async function seed() {
  // Create 2 users
  const user1 = await createUser("bobdob1111", "cupid123");

  const user2 = await createUser("bobdob9999", "bear!");

  for (let i = 1; i <= 20; i++) {
    //randomly pick a user to be assigned to the newly created playlist
    const user = Math.ceil(2 * Math.random());
    await createPlaylist(
      "Playlist " + i,
      "lorem ipsum playlist description",
      //a third argument is added to assign user to a playlist.
      user
    );
    await createTrack("Track " + i, i * 50000);
  }

  for (let i = 1; i <= 5; i++) {
    const playlistId = 1 + Math.floor(i / 2);
    await createPlaylistTrack(playlistId, i);
  }
}
