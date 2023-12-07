'use client'
import Script from 'next/script'
import { useRef } from 'react';

export default function Playback() {
  const videoRef = useRef(null)


  const initialize = () => {
    if (IVSPlayer.isPlayerSupported) {
      const player = IVSPlayer.create();
      player.attachHTMLVideoElement(videoRef.current);

      player.load(process.env.NEXT_PUBLIC_PLAYBACK_URL);
      player.play();

    }

  }

  return (
    <>
      <Script
        src='https://player.live-video.net/1.23.0/amazon-ivs-player.min.js'
        onLoad={() => {
          initialize()
        }}
      />
      <div className="pt-24 w-screen flex flex-row justify-center">
        <h1 className="text-6xl font-bold">Playback a channel</h1>
      </div>
      <div className="pt-24 w-screen flex flex-row justify-center">
        <p className="text-xl">Here we playback a stage on a Low Latency Stream with Server Side Composition.</p>
      </div>
      <div className="pt-24 w-screen flex flex-row justify-center">
        <video ref={videoRef} controls autoPlay />
      </div>
    </>
  )
}