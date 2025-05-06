import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
} from "vitest";

import app from "#app";
import db from "#db/client";

beforeAll(async () => {
  await db.connect();
});
afterAll(async () => {
  await db.end();
});

describe("POST /users/register", () => {
  beforeEach(async () => {
    await db.query("BEGIN");
  });
  afterEach(async () => {
    await db.query("ROLLBACK");
  });

  it("sends 400 if request body is invalid", async () => {
    const response = await request(app).post("/users/register").send({});
    expect(response.status).toBe(400);
  });

  it("creates a new user with a hashed password and sends a token", async () => {
    const response = await request(app).post("/users/register").send({
      username: "foo",
      password: "bar",
    });

    const {
      rows: [user],
    } = await db.query("SELECT * FROM users WHERE username = 'foo'");
    expect(user).toBeDefined();
    expect(user).toHaveProperty("password");
    expect(user.password).not.toBe("bar");

    expect(response.status).toBe(201);
    expect(response.text).toMatch(/eyJ.*/);
  });
});

describe("Protected routes", () => {
  let token;

  beforeAll(async () => {
    await db.query("BEGIN");
    const response = await request(app).post("/users/login").send({
      username: "user1",
      password: "password",
    });
    token = response.text;
  });

  afterAll(async () => {
    await db.query("ROLLBACK");
  });

  describe("POST /users/login", () => {
    it("sends 400 if request body is invalid", async () => {
      const response = await request(app).post("/users/login").send({});
      expect(response.status).toBe(400);
    });

    it("sends a token if credentials are valid", async () => {
      expect(token).toBeDefined();
      expect(token).toMatch(/eyJ.*/);
    });
  });

  describe("GET /playlists", () => {
    it("sends 401 if user is not authenticated", async () => {
      const response = await request(app).get("/playlists");
      expect(response.status).toBe(401);
    });
    it("sends playlists owned by the user", async () => {
      const response = await request(app)
        .get("/playlists")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);

      const { rows: playlists } = await db.query(
        "SELECT * FROM playlists WHERE user_id = 1",
      );

      expect(response.body).toEqual(playlists);
    });
  });

  describe("POST /playlists", () => {
    it("sends 401 if user is not authenticated", async () => {
      const response = await request(app).post("/playlists").send({
        name: "My playlist",
        description: "My description",
      });
      expect(response.status).toBe(401);
    });
    it("creates a new playlist owned by the user", async () => {
      await db.query("BEGIN");
      const response = await request(app)
        .post("/playlists")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "My playlist",
          description: "My description",
        });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user_id");
      expect(response.body.user_id).toBe(1);
      await db.query("ROLLBACK");
    });
  });

  describe("GET /playlists/:id", () => {
    it("sends 401 if user is not authenticated", async () => {
      const response = await request(app).get("/playlists/1");
      expect(response.status).toBe(401);
    });
    it("sends 403 if user does not own the playlist", async () => {
      const response = await request(app)
        .get("/playlists/2")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    });
  });

  describe("GET /playlists/:id/tracks", () => {
    it("sends 401 if user is not authenticated", async () => {
      const response = await request(app).get("/playlists/1/tracks");
      expect(response.status).toBe(401);
    });
    it("sends 403 if user does not own the playlist", async () => {
      const response = await request(app)
        .get("/playlists/3/tracks")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    });
  });

  describe("GET /tracks/:id/playlists", () => {
    it("sends 401 if user is not authenticated", async () => {
      const response = await request(app).get("/tracks/1/playlists");
      expect(response.status).toBe(401);
    });
    it("sends 404 if track does not exist", async () => {
      const response = await request(app)
        .get("/tracks/999/playlists")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(404);
    });
    it("sends playlists owned by the user that contain the track", async () => {
      const response = await request(app)
        .get("/tracks/1/playlists")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 1,
          name: "playlist1",
          description: "description1",
          user_id: 1,
        },
      ]);
    });
  });
});
