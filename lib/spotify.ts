import Cookies from "cookies";
import type { NextApiRequest, NextApiResponse } from "next";
import querystring from "querystring";

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

export async function auth(req: NextApiRequest, res: NextApiResponse, forceReset = false): Promise<string | boolean | undefined> {
  const cookies = new Cookies(req, res);

  const refreshToken = cookies.get("spotify.refresh_token2");
  let accessToken = cookies.get("spotify.access_token2");
  const expireTime = cookies.get("spotify.expire_time2") ?? "0";

  const secure = req.headers.host?.indexOf("localhost") === -1;

  const CALLBACK = `http${secure ? "s" : ""}://${
    req.headers.host
  }/api/one-auth`;

  const { code } = req.query;

  if (code && !refreshToken) {
    const newToken = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK,
      }),
    });
    const newTokenJson = await newToken.json();
    accessToken = newTokenJson.access_token;
    cookies.set("spotify.access_token2", accessToken);
    cookies.set("spotify.refresh_token2", newTokenJson.refresh_token);

    // multiply by 0.95 so we refresh just before it expires
    const future = Date.now() + newTokenJson.expires_in * 1000 * 0.95;
    cookies.set("spotify.expire_time2", String(future));
    res.redirect("/cs428");
    return false;
  }

  // User has not linked their account
  else if (!refreshToken || forceReset) {
    const state = "afhskeifisnfksuf";
    const scope = "streaming user-read-email user-read-private";

    const redirect =
      "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: CALLBACK,
        state: state,
      });
    res.status(302).send({ redirect });
    return false;
  } 
  
  else if (refreshToken && Date.now() >= parseInt(expireTime)) {
    const newToken = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const newTokenJson = await newToken.json();

    console.log(newTokenJson)

    accessToken = newTokenJson.access_token

    if (accessToken) {
      cookies.set("spotify.access_token2", accessToken);

      // multiply by 0.95 so we refresh just before it expires
      const future = Date.now() + newTokenJson.expires_in * 1000 * 0.95;
      cookies.set("spotify.expire_time2", String(future));
    } else {
      return auth(req, res, true)
    }
  }

  return accessToken;
}

export function getAccessToken(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);
  return cookies.get("spotify.access_token2") ?? "";
}

const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

interface Config extends Omit<RequestInit, "body"> {
  body?: Record<string, any>;
}

function createApiFn(
  endpoint: (config: { params?: Record<string, string | number | boolean> }) => string,
  configFn: (config: {
    params?: Record<string, string | number | boolean>;
  }) => Config = () => ({})
) {
  return async (
    accessToken: string,
    config: { params?: Record<string, string | number | boolean> } = {}
  ) => {
    const { body, ...fetchConfig } = configFn(config);

    const data = await fetch(`https://api.spotify.com/v1${endpoint(config)}`, {
      ...fetchConfig,
      headers: {
        ...fetchConfig.headers,
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (fetchConfig.method ?? "GET" !== "GET") {
      return {};
    }

    return await data.json();
  };
}

export const spotify = {
  currentlyPlaying: createApiFn(() => "/me/player/currently-playing"),
  player: createApiFn(() => "/me/player"),
  audioAnalysis: createApiFn(({ params }) => `/audio-analysis/${params?.id}`),
  audioFeatures: createApiFn(({ params }) => `/audio-features/${params?.id}`),
  restartSong: createApiFn(
    () => "/me/player/seek?position_ms=0",
    () => ({
      method: "PUT",
    })
  ),
  transferPlayback: createApiFn(
    () => `/me/player`,
    ({ params }) => ({
      method: "PUT",
      body: {
        device_ids: [params?.deviceId],
        play: true
      },
    })
  ),
  toggleShuffle: createApiFn(
    ({ params }) => `/me/player/shuffle?state=${params?.shuffle}`,
    () => ({
      method: "PUT",
    })
  ),
  toggleRepeat: createApiFn(
    ({ params }) => {
      const state =
        ["off", "context", "track"][(params?.repeat as any) ?? 0] ?? "off";
      return `/me/player/repeat?state=${state}`;
    },
    () => ({
      method: "PUT",
    })
  ),
};
