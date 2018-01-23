import * as express from "express"
import { middleware as apicache } from "apicache"
import * as config from "../_config"
import * as routes from "./_routes"
import * as url from "url"
import * as ytdl from "ytdl-core"
import createFeed from "../feed"
import playlist from "../youtube/playlist"
import playlistItems from "../youtube/playlistItems"

const app = express()

app.get(
  "/" + routes.playlistPodcast(),
  apicache(
    `${config.CACHE_PODCAST_SECONDS} seconds`,
    !config.CACHE ? () => false : undefined
  ),
  async (req, res) => {
    const baseUrl = url.format({
      protocol: req.protocol,
      host: req.hostname,
      pathname: req.baseUrl || "/"
    })
    const completeUrl = url.resolve(
      baseUrl,
      routes.playlistPodcast(req.params.playlistId)
    )
    const playlistInfo = await playlist(req.params.playlistId)
    const items = playlistItems(req.params.playlistId)

    const feed = await createFeed(
      completeUrl,
      (playlistId, itemId) => ({
        url: url.resolve(baseUrl, routes.videoPlay(itemId)),
        type: "video/mp4"
      }),
      playlistInfo,
      items
    )

    res.contentType("text/xml")
    res.send(feed)
  }
)

app.get("/" + routes.videoPlay(), async (req, res) => {
  const info = await ytdl.getInfo(req.params.videoId)
  const chosenFormat = ytdl.chooseFormat(info.formats, {
    quality: "highest",
    filter: format => format.container === "mp4" && format.audioEncoding != null
  }) as ytdl.videoFormat
  res.redirect(chosenFormat.url)
})

export default app
