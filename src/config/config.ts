// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

import Joi from 'joi'

export enum MODES {
    STANDALONE = 'STANDALONE',
    GRID = 'GRID',
    NODE = 'NODE',
}

const modeArg = process.argv[2]
if (!modeArg || !Object.keys(MODES).some((m) => m === modeArg.toUpperCase())) {
    console.log('Mode is required:', Object.values(MODES).join(', '))
    process.exit(1)
}
const mode = modeArg.toUpperCase() as MODES

const envVarsSchema = Joi.object()
    .keys({
        SERVER_HOST: Joi.string().default(mode === MODES.GRID ? '0.0.0.0' : '127.0.0.1'),
        PORT: Joi.number().default(1347),
    })
    .unknown()

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env)

if (error) {
    throw new Error(`Config validation error: ${error.message}`)
}

export default {
    mode,
    port: envVars.PORT,
    serverHost: envVars.SERVER_HOST,
}
