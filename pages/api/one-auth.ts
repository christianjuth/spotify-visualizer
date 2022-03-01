import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "../../lib/spotify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = await auth(req, res)  
  
  if (authToken !== false) {
    res.send({ authToken });
  }
}
