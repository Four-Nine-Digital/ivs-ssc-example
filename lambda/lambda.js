import { IVSRealTimeClient, CreateEncoderConfigurationCommand, StartCompositionCommand, ListEncoderConfigurationsCommand } from "@aws-sdk/client-ivs-realtime"

export const handler = async (event, context) => {
  console.log(event)
  //Update the ARN based on the Real-time stage you just created
  if (event.resources[0] !== "arn:aws:ivs:us-west-2:xxxxxxx:stage/xxxxxxx") {
    return
  }

  if (event.detail.event_name !== 'Participant Published') {
    return
  }
  console.log({ event })

  // Update the Region if you are deploying the lambda in a different region
  const client = new IVSRealTimeClient({
    region: 'us-west-2'
  })

  const commandListEncoderConfigurationsCommand = new ListEncoderConfigurationsCommand({ maxResults: 100 })
  const responseListEncoderConfigurations = await client.send(commandListEncoderConfigurationsCommand)

  const doCofigurationsExist = responseListEncoderConfigurations.encoderConfigurations.length > 0

  let encoderConfigurationArn = ""

  if (!doCofigurationsExist) {
    const inputRecordingConfig = { // CreateEncoderConfigurationRequest
      name: `record-configuration-${Date.now()}`,
      video: { // Video
        width: 1280,
        height: 720,
        framerate: 30,
        bitrate: 2500,
      },
    }
    const commandCreateRecordingConfig = new CreateEncoderConfigurationCommand(inputRecordingConfig)
    const responseRecordingConfig = await client.send(commandCreateRecordingConfig)
    encoderConfigurationArn = responseRecordingConfig.encoderConfiguration.arn
  } else {
    encoderConfigurationArn = responseListEncoderConfigurations.encoderConfigurations[0].arn
  }


  const idempotencyToken = `${event.resources[0]}-${Date.now()}`.replace(/:/g, '').replace(/\//g, '').substring(0, 63)
  console.log({ idempotencyToken, encoderConfigurationArn })

  const input = { // StartCompositionRequest
    stageArn: event.resources[0], // required
    idempotencyToken,
    layout: { // LayoutConfiguration
      grid: { // GridConfiguration
        featuredParticipantAttribute: "isFeature",
      },
    },
    destinations: [ // DestinationConfigurationList // required
      { // DestinationConfiguration
        name: "prashant-channel-destination",
        channel: { // ChannelDestinationConfiguration
          channelArn: "arn:aws:ivs:us-west-2:xxxxxxxx:channel/xxxxxxxxxx", // required
          encoderConfigurationArn,
        },
      },
    ]
  }
  const commandStartComposition = new StartCompositionCommand(input)
  const responseStartComposition = await client.send(commandStartComposition)

  console.log({ responseStartComposition })

  return
}
