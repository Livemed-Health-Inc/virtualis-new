# Mintti Smartho ⇄ Web bridge

`MinttiSmarthoSDK.framework` (v1.1.6) is a native iOS BLE framework, so it cannot be
imported into a browser bundle. The web console talks to it through a tiny host bridge:
the iOS app hosts this site in a `WKWebView`, forwards every `MinttiBleManagerDelegate`
callback into the page, and executes commands coming back out.

## Page → native (commands)

`window.webkit.messageHandlers.mintti.postMessage(cmd)` where `cmd` is one of:

| command | native call |
| --- | --- |
| `{cmd:"startScan"}` | `startScanMinttiSmatho` |
| `{cmd:"stopScan"}` | `stopScanMinttiSmatho` |
| `{cmd:"connect",uuid}` | `connectToMinttiSmarthoWithUUID:` |
| `{cmd:"disconnect"}` | `disconnectFromMinttiSmartho` |
| `{cmd:"startAudio"}` | `startGetMinttiSmarthoAudioData` |
| `{cmd:"stopAudio"}` | `stopGetMinttiSmarthoAudioData` |
| `{cmd:"setEchoMode",mode:0\|1}` | `setMinttiSmarthoEchoMode:` (0 = bell, 1 = diaphragm) |
| `{cmd:"readBattery"}` | `readMinttiSmarthtoBatteryCharValue` |
| `{cmd:"readVersion"}` | `readMinttiSmarthtoVersionCharValue` |

## Native → page (events)

Call `window.__minttiEmit(json)` from the delegate methods:

```objc
- (void)minttiBleManagerOnAudioResultData:(NSData *)resultData {
  NSString *b64 = [resultData base64EncodedStringWithOptions:0];
  [self emit:@{@"type": @"audio", @"channel": @"result", @"pcm": b64}];
}

- (void)emit:(NSDictionary *)payload {
  NSData *d = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
  NSString *js = [NSString stringWithFormat:@"window.__minttiEmit(%@)",
                  [[NSString alloc] initWithData:d encoding:NSUTF8StringEncoding]];
  dispatch_async(dispatch_get_main_queue(), ^{ [self.webView evaluateJavaScript:js completionHandler:nil]; });
}
```

Event shapes (see `src/lib/stethoscope/mintti.ts`):

- `{type:"bleState", available}` — `minttiBleManagerOnBleStateChanaged:`
- `{type:"scanResult", uuid, name, rssi}` — `minttiBleManagerOnScanResult:name:RSSI:`
- `{type:"connectState", connected}` — `minttiBleManagerOnConnectStateChanged:`
- `{type:"audio", channel:"result"|"mic"|"spk", pcm:<base64 16-bit LE PCM>}` —
  `OnAudioResultData` / `OnAudioMicData` / `OnAudioSpkData`
- `{type:"battery", level}`, `{type:"version", version}`, `{type:"param", param}`
- `{type:"echoMode", mode:"bell"|"diaphragm"}`, `{type:"heartRate", bpm}`
- `{type:"captureState", capturing}` — `OnStartGetAudioData` / `OnStopGetAudioData`
- `{type:"pressTooBig"}` — `minttiPressTooBig`

Audio format per the SDK document: **8 kHz, 16-bit signed, mono**. The page resamples it to
the AudioContext rate inside an AudioWorklet ring buffer (`src/lib/stethoscope/pcm-stream.ts`).

Without a native host the app falls back to a simulator transport that emits the same
events, so the full UI is testable in a desktop browser.
