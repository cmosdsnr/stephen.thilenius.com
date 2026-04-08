import { serverURL } from './constants'

const url = (path: string) => new URL(path, serverURL).toString()

export const API = {
    // ESP devices
    ESPlist:                  () => url('/api/ESPlist'),
    ESPupdate:                () => url('/api/ESPupdate'),

    // Power meter
    powerMeterHours:     (hours: number) => url(`/api/powerMeter/Hours?hours=${hours}`),
    powerMeterDetails:        () => url('/api/powerMeter/details'),
    powerMeterRawData:        () => url('/api/powerMeter/rawData'),
    powerMeterRunScan:   (sel: string) => url(`/api/powerMeter/runScan?sel=${sel}`),
    powerMeterWriteFreq:      () => url('/api/powerMeter/writeFreq'),

    // Solar edge
    solarEdgeRange:  (from: Date, to: Date) => url(`/api/solarEdge/Range?from=${from.toISOString()}&to=${to.toISOString()}`),
    solarEdgeUnitInfo:        () => url('/api/solarEdge/UnitInfo'),

    // Ultimeter
    ultimeterRange:  (from: Date, to: Date) => url(`/api/ultimeterRange?from=${from.toISOString()}&to=${to.toISOString()}`),

    // Sprinkler
    sprinklerIsConnected:     () => url('/api/sprinkler/isConnected'),
    sprinklerFound:           () => url('/api/sprinkler/found'),
    sprinklerLoad:            () => url('/api/sprinkler/load'),

    // Gallery
    readDirectories: (mode: string) => url(`/api/readDirectories/${mode}`),
    readImages:   (name: string, type: string) => url(`/api/readImages/${encodeURIComponent(name)}/${type}`),
    rotation:     (name: string, type: string) => url(`/api/rotation/${encodeURIComponent(name)}/${type}`),

    // File share
    getAvailableFiles:        () => url('/api/getAvailableFiles'),
    fileDownload:    (file: string) => url(`/api/file?file=${encodeURIComponent(file)}`),
    fileDelete:      (file: string) => url(`/api/delete?file=${encodeURIComponent(file)}`),
    uploadFiles:              () => url('/api/upload_files'),

    // Games
    getWordList:              () => url('/api/getWordList'),
}
