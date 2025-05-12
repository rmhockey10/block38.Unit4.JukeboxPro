import express from "express";
const router = express.Router();
export default router;

import {
  getTracks,
  getTrackById,
  getPlaylistsbyTrack,
} from "#db/queries/tracks";
import requireUser from "#middleware/requireUser";

router.route("/").get(async (req, res) => {
  const tracks = await getTracks();
  res.send(tracks);
});

router.param("trackID", async (req, res, next, trackID) => {
  const track = await getTrackById(trackID);
  if (!track) return res.status(404).send("Track not found.");
  req.track = track;
  next();
});

router.route("/:trackID").get((req, res) => {
  res.send(req.track);
});

router.use(requireUser);

router.route("/:trackID/playlists").get(async (req, res) => {
  const playlists = await getPlaylistsbyTrack(req.track.id, req.user.id);
  res.send(playlists);
});
