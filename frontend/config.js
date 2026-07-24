// Backend API base URL — single source of truth.
//
// On a physical device (iPhone via Expo Go), localhost won't work: the phone
// must reach your dev machine over the LAN. Set this to your Mac's current
// Wi-Fi IP (find it with `ipconfig getifaddr en0`), and make sure the backend
// is started with `--host 0.0.0.0` so it accepts connections from the phone.
//
// On the iOS Simulator you can use http://localhost:8000 instead.
export const API_URL = 'http://192.168.0.27:8000';
