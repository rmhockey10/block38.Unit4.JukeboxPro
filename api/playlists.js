import express from "express";
const router = express.Router();
export default router;

import {
  createPlaylist,
  getPlaylistById,
  getPlaylists,
} from "#db/queries/playlists";
import { createPlaylistTrack } from "#db/queries/playlists_tracks";
import { getTracksByPlaylistId } from "#db/queries/tracks";

import requireUser from "#middleware/requireUser";

router.use(requireUser);

router
  .route("/")
  .get(async (req, res) => {
    const playlists = await getPlaylists(req.user.id);
    res.send(playlists);
  })
  .post(async (req, res) => {
    if (!req.body) return res.status(400).send("Request body is required.");

    const { name, description } = req.body;
    const { id } = req.user;
    if (!name || !description)
      return res.status(400).send("Request body requires: name, description");

    const playlist = await createPlaylist(name, description, id);
    res.status(201).send(playlist);
  });

router.param("id", async (req, res, next, id) => {
  const playlist = await getPlaylistById(id);
  if (!playlist) return res.status(404).send("Playlist not found.");

  req.playlist = playlist;
  next();
});

router.route("/:id").get((req, res) => {
  if (req.user.id !== req.playlist.user_id) {
    return res
      .status(403)
      .send("You are not authorized to view this playlist.");
  }
  res.send(req.playlist);
});

router
  .route("/:id/tracks")
  .get(async (req, res) => {
    if (req.user.id !== req.playlist.user_id) {
      return res
        .status(403)
        .send("You are not authorized to view this playlist.");
    }

    const tracks = await getTracksByPlaylistId(req.playlist.id);
    res.send(tracks);
  })
  .post(async (req, res) => {
    if (!req.body) return res.status(400).send("Request body is required.");

    const { trackId } = req.body;
    if (!trackId) return res.status(400).send("Request body requires: trackId");

    if (req.user.id !== req.playlist.user_id) {
      return res
        .status(403)
        .send("You are not authorized to view this playlist.");
    }

    const playlistTrack = await createPlaylistTrack(req.playlist.id, trackId);
    res.status(201).send(playlistTrack);
  });
