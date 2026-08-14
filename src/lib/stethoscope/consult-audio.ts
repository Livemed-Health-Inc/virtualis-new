/**
 * Consult-audio integration seam.
 *
 * Returns the live, processed stethoscope audio track ONLY when a real device
 * is streaming. Twilio (or any other WebRTC provider) is not implemented in
 * this project yet, so nothing is published here — see `getConsultAudioTrack`
 * for the exact future handoff.
 */
import type { StethoscopeState } from "@/sdk/stethoscope";

export interface ConsultAudioSource {
  track: MediaStreamTrack;
  stream: MediaStream;
  /** Transport that produced the audio: "native" bridge or "webble". */
  hostKind: StethoscopeState["hostKind"];
}

/**
 * Live stethoscope audio for a clinical consult, or `null`.
 *
 * Requirements — all must hold, so a simulator feed can never be mistaken for
 * clinical hardware:
 *  - `hostKind` is not "simulator"
 *  - the device is connected AND capturing
 *  - the processed `callStream` exists and carries a live audio track
 *
 * Future Twilio handoff (not implemented here):
 *   const src = getConsultAudioSource(state);
 *   if (src) {
 *     const localTrack = new Twilio.LocalAudioTrack(src.track, { name: "stethoscope" });
 *     await room.localParticipant.publishTrack(localTrack);
 *   }
 * and on stop: `room.localParticipant.unpublishTrack(localTrack)`.
 */
export function getConsultAudioSource(state: StethoscopeState): ConsultAudioSource | null {
  if (state.hostKind === "simulator") return null;
  if (!state.connected || !state.capturing) return null;
  const stream = state.callStream;
  if (!stream) return null;
  const track = stream.getAudioTracks().find((t) => t.readyState === "live");
  return track ? { track, stream, hostKind: state.hostKind } : null;
}

/** Convenience accessor for callers that only need the track. */
export function getConsultAudioTrack(state: StethoscopeState): MediaStreamTrack | null {
  return getConsultAudioSource(state)?.track ?? null;
}
