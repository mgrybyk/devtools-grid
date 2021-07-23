import { Router } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { spawnNodeConnection } from '../../components/grid-connection'

export const gridRoute = Router()

gridRoute.post(
    '/spawn',
    asyncHandler(async (req, res) => {
        const uuid = await spawnNodeConnection(req.body.chromeFlags)
        res.json({ uuid })
    })
)
