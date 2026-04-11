/**
 * VideoRoom Component
 * 
 * A full-screen video call page using Agora RTC. It provides a large remote feed
 * and a small local picture-in-picture feed, along with controls for mic, camera,
 * and ending the call.
 * 
 * @param {Object} props
 * @param {string} props.sessionId - The active session ID to fetch tokens for.
 * @param {string} props.peerName - The name of the person on the other end.
 * @param {function} props.onEndRedirect - Callback to redirect the user to a thank-you page.
 */
import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const MicIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </svg>
);

const MicOffIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="m4 4 16 16" />
    <path d="M9.2 9.2V12a2.8 2.8 0 0 0 4.78 1.98" />
    <path d="M15 9.34V6a3 3 0 0 0-5.12-2.12" />
    <path d="M19 10v2a7 7 0 0 1-11.08 5.74" />
    <path d="M12 19v3" />
  </svg>
);

const VideoIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3" />
  </svg>
);

const VideoOffIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="m4 4 16 16" />
    <path d="M10 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11" />
    <path d="m16 10 5-3v10l-5-3" />
  </svg>
);

const PhoneOffIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="m4 4 16 16" />
    <path d="M16.72 13.06a10.94 10.94 0 0 0 3.11-.52 1 1 0 0 1 1.1.36l1.74 2.38a1 1 0 0 1-.24 1.45A19 19 0 0 1 3.27 4.31a1 1 0 0 1 1.45-.24L7.1 5.8a1 1 0 0 1 .36 1.1 10.94 10.94 0 0 0-.52 3.11" />
  </svg>
);

const LoaderIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...iconProps}>
    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
  </svg>
);

const VideoRoom = ({ sessionId, peerName = 'Doctor/Patient', onEndRedirect }) => {
  const [status, setStatus] = useState('connecting'); // connecting, live, ended
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [timer, setTimer] = useState(0);

  const localPlayerRef = useRef(null);
  const remotePlayerRef = useRef(null);
  const clientRef = useRef(null);

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.status === 204 ? null : response.json();
  };

  const loadAgoraRtc = async () => {
    const moduleName = 'agora-rtc-sdk-ng';
    const agoraModule = await import(/* @vite-ignore */ moduleName);
    return agoraModule.default || agoraModule;
  };

  // Handle call timer
  useEffect(() => {
    let interval;
    if (status === 'live') {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Agora Initialization
  useEffect(() => {
    const initAgora = async () => {
      try {
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Fetch Agora Token and Channel Name
        const AgoraRTC = await loadAgoraRtc();
        const data = await requestJson(`${baseUrl}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { channelName, agoraToken, appId } = data;

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remotePlayerRef.current) {
            user.videoTrack.play(remotePlayerRef.current);
          }
          if (mediaType === 'audio') {
            user.audioTrack.play();
          }
        });

        await client.join(appId, channelName, agoraToken, null);

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        await client.publish([audioTrack, videoTrack]);

        if (localPlayerRef.current) {
          videoTrack.play(localPlayerRef.current);
        }

        setStatus('live');
      } catch (error) {
        console.error('Failed to initialize Agora RTC:', error);
        setStatus('error');
      }
    };

    if (sessionId) initAgora();

    return () => {
      cleanupAgora();
    };
  }, [sessionId]);

  const cleanupAgora = () => {
    localAudioTrack?.close();
    localVideoTrack?.close();
    clientRef.current?.leave();
  };

  const handleEndCall = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

      await requestJson(`${baseUrl}/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      cleanupAgora();
      setStatus('ended');
      if (onEndRedirect) onEndRedirect();
    }
  };

  const toggleMic = () => {
    if (localAudioTrack) {
      localAudioTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localVideoTrack) {
      localVideoTrack.setMuted(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (status === 'ended') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <p className="text-xl font-semibold text-gray-700">Call Ended</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 px-6 text-center">
        <div>
          <p className="text-xl font-semibold text-gray-700">Video room is unavailable</p>
          <p className="mt-2 text-sm text-gray-500">
            The telemedicine client could not be initialized in this environment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-gray-900 overflow-hidden flex flex-col">
      {/* Top Session Info Bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-10">
        <div className="text-white">
          <h2 className="text-lg font-semibold">{peerName}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {status === 'connecting' ? (
              <span className="flex items-center gap-1"><LoaderIcon className="w-3 h-3 animate-spin"/> Connecting...</span>
            ) : (
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live</span>
            )}
          </div>
        </div>
        <div className="text-white font-mono text-xl tracking-wider">
          {formatTimer(timer)}
        </div>
      </div>

      {/* Main Remote Video Feed */}
      <div className="flex-1 w-full bg-gray-900" ref={remotePlayerRef}>
        {status === 'connecting' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <span className="mb-4 text-sm uppercase tracking-[0.3em]">Loading</span>
            <LoaderIcon className="w-8 h-8 animate-spin mb-4" />
            <p>Waiting for connection...</p>
          </div>
        )}
      </div>

      {/* Local Picture-in-Picture Video */}
      <div 
        className="absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-64 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700"
        ref={localPlayerRef}
      >
        {isVideoOff && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
            <VideoOffIcon className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 w-full p-6 flex justify-center items-center gap-6 bg-gradient-to-t from-black/80 to-transparent z-10">
        <button 
          onClick={toggleMic}
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-800 hover:bg-white/90'}`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
        </button>

        <button 
          onClick={handleEndCall}
          className="p-5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
          title="End Call"
        >
          <PhoneOffIcon className="w-8 h-8" />
        </button>

        <button 
          onClick={toggleCamera}
          className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-800 hover:bg-white/90'}`}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
        >
          {isVideoOff ? <VideoOffIcon className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

export default VideoRoom;
