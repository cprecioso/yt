import get from "micro-get"
import host from "micro-host"
import protocol from "micro-protocol"
import { NextApiRequest, NextApiResponse } from "next"
import createFeed from "../../create-feed"
import requestPlaylistData from "../../playlist"

export type Request = {
  id: string
}

export default get<NextApiRequest, NextApiResponse>(
  host(
    protocol(
      async (req, res) => {
        try {
          const { href } = new URL(`${req.protocol}://${req.host}${req.url}`)

          const { id } = req.query as Request
          if (!id) throw new Error("ID not found")

          const playlistData = await requestPlaylistData(id)

          const feed = createFeed(
            href,
            id => ({
              url: new URL(`/api/play?id=${id}`, href).href,
              type: "video/mp4"
            }),
            playlistData
          )

          res.status(200)
          res.setHeader("Content-Type", "text/xml")
          res.send(feed)
        } catch (error) {
          res.status(500).send("" + error)
        }
      },
      { trustProxy: true }
    ),
    { trustProxy: true }
  )
)