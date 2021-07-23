import express from 'express'
import { healthRoute } from './middlewares/health'

import { gridRoute } from './routes/v1/grid-routes'
import { nodeRoute } from './routes/v1/node-routes'
import { ApiError } from './error'
import { errorConverter, errorHandler } from './middlewares/error'
import config, { MODES } from './config/config'

export const app = express()

// parse json request body
app.use(express.json())

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }))

app.use('/health', healthRoute)

// v1 api routes
if (config.mode === MODES.GRID) {
    app.use('/devtools', gridRoute)
} else if (config.mode === MODES.STANDALONE) {
    app.use('/devtools', nodeRoute)
}

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
    next(new ApiError(404, 'Not found'))
})

// convert error to ApiError, if needed
app.use(errorConverter)

// handle error
app.use(errorHandler)
