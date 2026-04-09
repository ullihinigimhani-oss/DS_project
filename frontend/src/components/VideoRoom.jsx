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
import axios from 'axios';
import AgoraRTC from 'agora-rtc-sdk-ng';

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
        const response = await axios.get(`${baseUrl}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const { channelName, agoraToken, appId } = response.data;

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

      await axios.post(`${baseUrl}/sessions/${sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
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

  return (
    <div className="relative h-screen w-full bg-gray-900 overflow-hidden flex flex-col">
      {/* Top Session Info Bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-10">
        <div className="text-white">
          <h2 className="text-lg font-semibold">{peerName}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {status === 'connecting' ? (
              <span className="flex items-center gap-1"><span className="text-xs">...</span> Connecting...</span>
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
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Video Off</span>
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
          <span className="text-sm font-semibold uppercase">{isMuted ? 'Muted' : 'Mic'}</span>
        </button>

        <button 
          onClick={handleEndCall}
          className="p-5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
          title="End Call"
        >
          <span className="text-sm font-semibold uppercase">End</span>
        </button>

        <button 
          onClick={toggleCamera}
          className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 text-gray-800 hover:bg-white/90'}`}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
        >
          <span className="text-sm font-semibold uppercase">{isVideoOff ? 'Camera Off' : 'Camera'}</span>
        </button>
      </div>
    </div>
  );
};

export default VideoRoom;
