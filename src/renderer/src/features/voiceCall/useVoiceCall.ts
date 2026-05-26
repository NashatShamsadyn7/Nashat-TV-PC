import { useCallback, useEffect, useRef, useState } from 'react'
import {
  off,
  onChildAdded,
  onChildRemoved,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update
} from 'firebase/database'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/authStore'

// Free public STUN servers from Google. Sufficient for ~80% of networks; if a
// peer is behind a symmetric NAT they will fail to connect — that's a TURN
// problem we accept for now (TURN servers cost money).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
]

type PeerEntry = {
  pc: RTCPeerConnection
  audio: HTMLAudioElement
  stream: MediaStream
}

type SignalPayload =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit }

type Signal = SignalPayload & { from: string }

export type VoiceCallState = {
  inCall: boolean
  muted: boolean
  participants: string[]
  speaking: string[]
  start: () => Promise<void>
  leave: () => Promise<void>
  toggleMute: () => void
}

// WebRTC mesh: each peer maintains a direct connection to every other peer in
// the room's voice channel. Works great for 2–6 simultaneous mics. Signaling
// (offer/answer/ICE) rides on Firebase RTDB at `rooms/{roomId}/voice/`.
export function useVoiceCall(roomId: string | null): VoiceCallState {
  const user = useAuthStore((s) => s.user)
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])
  const [speaking, setSpeaking] = useState<string[]>([])

  const localStream = useRef<MediaStream | null>(null)
  const peers = useRef<Map<string, PeerEntry>>(new Map())
  const cleanupSignals = useRef<Array<() => void>>([])
  const speakingTimer = useRef<number | null>(null)

  const myUid = user?.uid

  // Send a signal targeted at one specific peer.
  const sendSignal = useCallback(
    async (toUid: string, payload: SignalPayload) => {
      if (!roomId || !myUid) return
      await push(ref(db, `rooms/${roomId}/voice/${toUid}/inbox`), {
        ...payload,
        from: myUid,
        at: Date.now()
      })
    },
    [roomId, myUid]
  )

  const createPeer = useCallback(
    (remoteUid: string, isInitiator: boolean) => {
      if (!localStream.current) return null
      if (peers.current.has(remoteUid)) return peers.current.get(remoteUid)!

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const remoteStream = new MediaStream()
      const audio = new Audio()
      audio.autoplay = true
      audio.srcObject = remoteStream

      // Push our local mic tracks into the new connection.
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!)
      })

      pc.ontrack = (ev) => {
        ev.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t))
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          void sendSignal(remoteUid, { type: 'ice', candidate: ev.candidate.toJSON() })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          tearDownPeer(remoteUid)
        }
      }

      const entry: PeerEntry = { pc, audio, stream: remoteStream }
      peers.current.set(remoteUid, entry)
      setParticipants(Array.from(peers.current.keys()))

      if (isInitiator) {
        void (async () => {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await sendSignal(remoteUid, { type: 'offer', sdp: offer.sdp || '' })
        })()
      }

      return entry
    },
    [sendSignal]
  )

  const tearDownPeer = useCallback((remoteUid: string) => {
    const entry = peers.current.get(remoteUid)
    if (!entry) return
    entry.pc.close()
    entry.audio.pause()
    entry.audio.srcObject = null
    peers.current.delete(remoteUid)
    setParticipants(Array.from(peers.current.keys()))
  }, [])

  const handleSignal = useCallback(
    async (signal: Signal) => {
      if (signal.from === myUid) return
      let entry = peers.current.get(signal.from)
      if (!entry) {
        // A peer is reaching out before we knew about them.
        const created = createPeer(signal.from, false)
        if (!created) return
        entry = created
      }
      const pc = entry.pc
      if (signal.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await sendSignal(signal.from, { type: 'answer', sdp: answer.sdp || '' })
      } else if (signal.type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        }
      } else if (signal.type === 'ice') {
        try {
          await pc.addIceCandidate(signal.candidate)
        } catch {
          /* candidate may arrive before remote description; safe to drop */
        }
      }
    },
    [myUid, createPeer, sendSignal]
  )

  const start = useCallback(async () => {
    if (!roomId || !myUid) throw new Error('غير مسجّل دخول أو لا توجد غرفة')
    if (inCall) return
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })
    localStream.current = stream
    setInCall(true)

    // Voice-activity detection — gives the UI a "speaking" highlight without
    // shipping the audio data anywhere except the peer connections.
    const ctx = new AudioContext()
    const sourceNode = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    sourceNode.connect(analyser)
    const buffer = new Uint8Array(analyser.frequencyBinCount)
    speakingTimer.current = window.setInterval(() => {
      analyser.getByteFrequencyData(buffer)
      let sum = 0
      for (let i = 0; i < buffer.length; i++) sum += buffer[i]
      const avg = sum / buffer.length
      setSpeaking((prev) => {
        const isSpeaking = avg > 18
        if (!myUid) return prev
        if (isSpeaking && !prev.includes(myUid)) return [...prev, myUid]
        if (!isSpeaking && prev.includes(myUid)) return prev.filter((u) => u !== myUid)
        return prev
      })
    }, 200)

    // Register presence in the voice room and clean up on disconnect.
    const presenceRef = ref(db, `rooms/${roomId}/voice/${myUid}/presence`)
    await set(presenceRef, { joinedAt: serverTimestamp() })
    onDisconnect(presenceRef).remove().catch(() => {})
    onDisconnect(ref(db, `rooms/${roomId}/voice/${myUid}/inbox`))
      .remove()
      .catch(() => {})

    // Listen to my inbox for signals from any peer.
    const inboxRef = ref(db, `rooms/${roomId}/voice/${myUid}/inbox`)
    const inboxHandler = onChildAdded(inboxRef, async (snap) => {
      const data = snap.val() as Signal
      await handleSignal(data)
      // Drain processed signals so they don't replay on reconnect.
      await remove(snap.ref)
    })
    cleanupSignals.current.push(() => off(inboxRef, 'child_added', inboxHandler))

    // Watch the participant list. Each peer with a lower uid initiates the
    // offer, which gives us a deterministic, collision-free handshake.
    const rosterRef = ref(db, `rooms/${roomId}/voice`)
    const addedHandler = onChildAdded(rosterRef, (snap) => {
      const remoteUid = snap.key
      if (!remoteUid || remoteUid === myUid) return
      const presenceExists = snap.child('presence').exists()
      if (!presenceExists) return
      const initiator = myUid < remoteUid
      createPeer(remoteUid, initiator)
    })
    const removedHandler = onChildRemoved(rosterRef, (snap) => {
      const remoteUid = snap.key
      if (!remoteUid) return
      tearDownPeer(remoteUid)
    })
    cleanupSignals.current.push(() => off(rosterRef, 'child_added', addedHandler))
    cleanupSignals.current.push(() => off(rosterRef, 'child_removed', removedHandler))

    cleanupSignals.current.push(() => {
      void ctx.close()
      if (speakingTimer.current) window.clearInterval(speakingTimer.current)
    })
  }, [roomId, myUid, inCall, createPeer, handleSignal, tearDownPeer])

  const leave = useCallback(async () => {
    cleanupSignals.current.forEach((fn) => fn())
    cleanupSignals.current = []
    peers.current.forEach((_, uid) => tearDownPeer(uid))
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop())
      localStream.current = null
    }
    if (roomId && myUid) {
      await remove(ref(db, `rooms/${roomId}/voice/${myUid}`))
    }
    setInCall(false)
    setMuted(false)
    setParticipants([])
    setSpeaking([])
  }, [roomId, myUid, tearDownPeer])

  const toggleMute = useCallback(() => {
    if (!localStream.current) return
    const next = !muted
    localStream.current.getAudioTracks().forEach((t) => (t.enabled = !next))
    setMuted(next)
  }, [muted])

  // Auto-leave on unmount or roomId change.
  useEffect(() => {
    return () => {
      void leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // Mirror room voice roster into local participants even before peer
  // connections fully establish — handy for the "X joined the call" UI.
  useEffect(() => {
    if (!roomId || !inCall) return
    const r = ref(db, `rooms/${roomId}/voice`)
    const handler = onValue(r, (snap) => {
      const raw = snap.val() as Record<string, { presence?: unknown }> | null
      if (!raw) {
        setParticipants([])
        return
      }
      const present = Object.keys(raw).filter((k) => k !== myUid && raw[k]?.presence)
      setParticipants(present)
    })
    return () => off(r, 'value', handler)
  }, [roomId, inCall, myUid])

  // Defensive cleanup of stale inbox entries on join, so we don't re-process
  // signals from a previous session.
  useEffect(() => {
    if (!roomId || !myUid || !inCall) return
    void update(ref(db, `rooms/${roomId}/voice/${myUid}`), { inbox: null }).catch(() => {})
  }, [roomId, myUid, inCall])

  return { inCall, muted, participants, speaking, start, leave, toggleMute }
}
