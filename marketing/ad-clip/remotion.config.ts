import { Config } from '@remotion/cli/config'

Config.setRspack(true)
Config.setVideoImageFormat('jpeg')
Config.setPixelFormat('yuv420p')
Config.setOverwriteOutput(true)
Config.setDefaultPremountInSeconds(2)
// where Remotion cannot download its own Chrome, point it at a local headless shell
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER)
}
