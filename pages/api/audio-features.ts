import { spotify, getAccessToken } from "../../lib/spotify";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const accessToken = getAccessToken(req, res);

  const itemId = String(req.query.id);

  const data = await spotify.audioFeatures(accessToken, {
    params: { id: itemId },
  });

  return res.status(200).json(data);
}
