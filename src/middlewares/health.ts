import { Router } from 'express'

const status = 'UP'

export const healthRoute = Router()
healthRoute.get('/', (req, res) => res.send({ status }))
