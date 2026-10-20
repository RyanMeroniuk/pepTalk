// Backend API base URL — single source of truth.
//
// localhost works on the iOS Simulator. On a physical device (iPhone via Expo
// Go), localhost won't work: the phone must reach your dev machine over the
// LAN. Set this to your Mac's current Wi-Fi IP (find it with
// `ipconfig getifaddr en0`), e.g. 'http://192.168.1.20:8000', and make sure the
// backend is started with `--host 0.0.0.0` so it accepts connections from the phone.
export const API_URL = 'http://localhost:8000';
