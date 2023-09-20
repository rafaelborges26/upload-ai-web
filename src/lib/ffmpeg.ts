/* eslint-disable @typescript-eslint/no-unused-vars */
import { FFmpeg } from '@ffmpeg/ffmpeg'

import coreUrl from '../ffmpeg/ffmpeg-core.js?url' // ?urlcarregar asyncrono so quando precisar
import wasmUrl from '../ffmpeg/ffmpeg-core.wasm?url'
import workerUrl from '../ffmpeg/ffmpeg-worker.js?url'

let ffmpeg: FFmpeg | null

export async function getFFmpeg() {
    if(ffmpeg) {
        return ffmpeg
    }

    ffmpeg = new FFmpeg()

    if(!ffmpeg.loaded) {
        await ffmpeg.load({
            coreURL: coreUrl,
            wasmURL: wasmUrl,
            workerURL: workerUrl
        })
    }

    return ffmpeg
}