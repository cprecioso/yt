import { middleware as apicache } from "apicache"
import * as express from "express"
import { chooseBiggestThumbnail } from "../feed/_util"
import playlist from "../youtube/playlist"
import * as config from "../_config"
import parseYTURL, { ListType } from "./parse-url"
import podcastApp from "./podcast"
import addCompiledPugEngine from "./templateEngine"
import { resolveUrl } from "./url"
import * as routes from "./_routes"

const app = express()

addCompiledPugEngine(app)
app.set("views", routes.viewsDir)
app.set("view engine", "pug.js")
app.enable("trust proxy")

app.get(
  "/",
  apicache(
    `${config.CACHE_FRONTEND_HOME_SECONDS} seconds`,
    !config.CACHE ? () => false : undefined
  ),
  (req, res) => {
    res.render("index", {
      formAction: resolveUrl(req, routes.formAction())
    })
  }
)

app.get("/" + routes.formAction(), async (req, res) => {
  if (!req.query.yturl) return res.redirect(req.baseUrl || "/")

  try {
    const url = req.query.yturl
    const { type, id } = await parseYTURL(url)
    if (type !== ListType.Playlist)
      throw new Error("Only playlists are supported for now")

    res.redirect("/" + routes.playlistInfo(id))
  } catch (err) {
    res.end("" + err)
  }
})

app.get(
  "/" + routes.playlistInfo(),
  apicache(
    `${config.CACHE_FRONTEND_PLAYLIST_SECONDS} seconds`,
    !config.CACHE ? () => false : undefined
  ),
  async (req, res) => {
    const id = req.params.playlistId

    const podcastUrl = resolveUrl(req, routes.playlistPodcast(id))

    const info = await playlist(id)
    const thumbnail = chooseBiggestThumbnail(info.snippet!.thumbnails).url

    res.render("playlist", {
      podcast: { url: podcastUrl },
      playlist: {
        thumbnail,
        name: info.snippet!.title,
        link: `https://www.youtube.com/playlist?list=${id}`,
        channel: {
          name: info.snippet!.channelTitle,
          link: `https://www.youtube.com/channel/${info.snippet!.channelId}`
        }
      }
    })
  }
)

app.use(podcastApp)
app.use(express.static(routes.publicDir))

app.use((req, res) => {
  res.status(404).render("error", { error: "Can't find that page" })
})

export default app
