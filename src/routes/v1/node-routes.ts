import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { spawnBrowser } from '../../components/node-connection'

export const nodeRoute = Router()

nodeRoute.post(
    '/spawn',
    asyncHandler(async (req, res) => {
        const uuid = await spawnBrowser(req.body.chromeFlags)
        res.json({ uuid })
    })
)
