'use client'
import Script from 'next/script'
import { useState } from 'react'

export default function Home() {
  const [videoDevices, setVideoDevices] = useState([])
  const [audioDevices, setAudioDevices] = useState([])
  const [participants, setParticipants] = useState([])
  const [participantToken, setParticipantToken] = useState([])
  const [stage, setStage] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [selectedVideoDevice, setSelectedVideoDevice] = useState(null)
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(null)
  const [isInitializeComplete, setIsInitializeComplete] = useState(false)
  const DEVICE_TYPE_VIDEO = "video"
  const DEVICE_TYPE_AUDIO = "audio"

  /**
   * Returns all devices available on the current device
  */
  const getDevices = async () => {
    // Prevents issues on Safari/FF so devices are not blank
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

    const devices = await navigator.mediaDevices.enumerateDevices()

    // Get all video devices
    const videoDevices = devices.filter((d) => d.kind === 'videoinput')
    if (!videoDevices.length) {
      console.error('No video devices found.')
    }

    // Get all audio devices
    const audioDevices = devices.filter((d) => d.kind === 'audioinput')
    if (!audioDevices.length) {
      console.error('No audio devices found.')
    }

    return { videoDevices, audioDevices }
  }

  /**
  * Function gets the video and audio devices connected to the laptop and stores them in the state
  */
  const setupUI = async () => {
    const { videoDevices, audioDevices } = await getDevices()
    console.log({ videoDevices, audioDevices })
    setVideoDevices(videoDevices)
    if (videoDevices.length >= 1) {
      setSelectedVideoDevice(videoDevices[0].deviceId)
    }
    setAudioDevices(audioDevices)
    if (audioDevices.length >= 1) {
      setSelectedAudioDevice(audioDevices[0].deviceId)
    }
  }


  /**
  * Function sets up the list of video devices connected to the user's computer
  */
  const getVideoDevicesListUI = () => {
    return <span className="pr-4">
      <label>Video Devices:</label>
      <br />
      <select onChange={(e) => {
        setSelectedVideoDevice(e.target.value)
      }}>
        {videoDevices.map((videoDevice) => {
          return (<option key={`videoDevice-${videoDevice.deviceId}`} value={videoDevice.deviceId} >{videoDevice.label}</option>)
        })}
      </select>
    </span>
  }


  /**
  * Function sets up the list of audio devices connected to the user's computer
  */
  const getAudioDevicesListUI = () => {
    return <span className="pr-4">
      <label>Audio Devices:</label>
      <br />
      <select onChange={(e) => {
        setSelectedAudioDevice(e.target.value)
      }}>
        {audioDevices.map((audioDevice) => {
          return (<option key={`audioDevice-${audioDevice.deviceId}`} value={audioDevice.deviceId} >{audioDevice.label}</option>)
        })}
      </select >
    </span>
  }



  /**
 * Get's the media stream for the microphone 
 * @param {*} deviceId string
 * @param {*} deviceType string <DEVICE_TYPE_VIDEO|DEVICE_TYPE_AUDIO>
 * @returns Promise <MediaStream>
 */
  const getUserMedia = (deviceId, deviceType) => {
    const inputParams = {
      video: false,
      audio: false
    }

    if (deviceType === DEVICE_TYPE_VIDEO) {
      inputParams.video = {
        deviceId: deviceId ? { exact: deviceId } : null,
      }
    } else if (deviceType === DEVICE_TYPE_AUDIO) {
      inputParams.audio = {
        deviceId: deviceId ? { exact: deviceId } : null,
      }
    }
    console.log({ inputParams, deviceId, deviceType })
    return navigator.mediaDevices.getUserMedia(inputParams)
  }

  /**
   * Sets up the Strategy for 3 major actions a user performs: which streams to publish, should streams be published, subcribing to streams
   * @param {*} cameraStageStream The current user's camera MediaStream
   * @param {*} micStageStream The current user's microphone MediaStream
   * @returns strategy object
   */
  const setupStrategy = (cameraStageStream, micStageStream) => {
    if (!isInitializeComplete) {
      return
    }

    const { SubscribeType } = IVSBroadcastClient

    const strategy = {
      stageStreamsToPublish() {
        return [cameraStageStream, micStageStream]
      },
      shouldPublishParticipant() {
        return true
      },
      shouldSubscribeToParticipant() {
        return SubscribeType.AUDIO_VIDEO
      }
    }
    return strategy
  }

  const getVideoUIForParticpants = () => {
    if (!isInitializeComplete) {
      return
    }

    const { StreamType } = IVSBroadcastClient

    return participants.map((participantAndStreamInfo) => {
      const { participant, streams } = participantAndStreamInfo
      let streamsToDisplay = streams;

      if (participant.isLocal) {
        // Ensure to exclude local audio streams, otherwise echo will occur
        streamsToDisplay = streams.filter(stream => stream.streamType === StreamType.VIDEO);
      }


      const videoEl = <video key={participant.id} muted autoPlay playsInline ref={(ref) => {
        if (ref) {
          ref.srcObject = new MediaStream()
          streamsToDisplay.forEach(stream => ref.srcObject.addTrack(stream.mediaStreamTrack));
        }
      }}></video>
      const videoLayout = (<span>
        <span className="participantPill">{participant.userId}</span>
        {videoEl}
      </span>)
      console.log({ participant })

      return videoLayout
    })
  }



  /**
   * Click Handler for Join Stage Button
  */
  const joinStage = async () => {
    if (!isInitializeComplete || isConnected) {
      return
    }
    console.log({ selectedVideoDevice, selectedAudioDevice })
    const localCamera = await getUserMedia(selectedVideoDevice, DEVICE_TYPE_VIDEO)
    console.log({ localCamera })
    const localMic = await getUserMedia(selectedAudioDevice, DEVICE_TYPE_AUDIO)

    const { Stage, LocalStageStream, StageEvents, ConnectionState } = IVSBroadcastClient

    const cameraStageStream = new LocalStageStream(localCamera.getVideoTracks()[0])
    const micStageStream = new LocalStageStream(localMic.getAudioTracks()[0])

    const strategy = setupStrategy(cameraStageStream, micStageStream)
    let stage = new Stage(participantToken, strategy);

    stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {

      if (state === ConnectionState.CONNECTED) {
        setIsConnected(true)
      } else {
        setIsConnected(false)
      }
    });
    stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
      console.log("Participant Media Added: ", participant, streams);
      setParticipants((prevParticipants) => {
        let participantExists = false
        prevParticipants.forEach((participantFromList) => {
          console.log({ participantFromList })
          if (participant.id === participantFromList.participant.id) {
            participantExists = true
          }
        })

        if (participantExists) {
          return [...prevParticipants]
        }
        return [...prevParticipants, { participant, streams }]
      })
    });

    stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED, (participant, streams) => {
      console.log("Participant Media Removed: ", participant);
      setParticipants((prevParticipants) => {
        return prevParticipants.filter((participantFromList) => {
          return participant.id !== participantFromList.participant.id
        })
      })
    });

    try {
      await stage.join();
      setStage(null)
    } catch (err) {
      stage = null
    }

    setStage(stage)



  }

  /**
   * Click handler for the Leave Stage button
   */
  const leaveStage = async () => {
    if (!initialize || !isConnected) {
      return
    }
    await stage.leave()
    setIsConnected(false)
  }



  /**
  * Initialize after the client is loaded
  */
  const initialize = async () => {
    setupUI()
    setIsInitializeComplete(true)
  }

  return (
    <>
      <div className="pt-24 w-screen flex flex-row justify-center">
        <Script
          src='https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js'
          onLoad={() => {
            initialize()
          }}
        />

        <div>
          <h1 className="text-6xl font-bold">Joining a stage </h1>
        </div>

      </div>
      <div className="w-screen flex flex-row justify-center">
        <p className="text-lg">with your desired devices. </p>
      </div>
      <div className="mt-20 w-screen flex flex-row justify-center space-x-4">
        {getVideoDevicesListUI()}
        {getAudioDevicesListUI()}
        <span>
          <label>Participant Token:</label>
          <br />
          <input value={participantToken} onChange={(e) => { setParticipantToken(e.target.value) }} type="text"></input>
        </span>
      </div>
      <div className="mt-10 w-screen flex flex-row justify-center space-x-4">

        {isInitializeComplete && (
          <button onClick={joinStage}>Join Stage</button>
        )
        }
        {isInitializeComplete && (
          <button onClick={leaveStage}>Leave Stage</button>
        )
        }
      </div>

      <br />
      <br />
      <br />
      <br />
      <div className="mt-10 w-screen flex flex-row justify-center space-x-4">
        {getVideoUIForParticpants()}
      </div>



    </>
  )
}
