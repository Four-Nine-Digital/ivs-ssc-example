# Table of Contents
### [What is Server Side Composition?](#what-is-server-side-composition)
### [Run the web application](#run-the-web-application)
### [Setup the Lambda function that broadcasts to a Low-latency channel](#setup-the-lambda-function-that-broadcasts-to-a-low-latency-channel)
### [Test Server Side Composition](#test-server-side-composition)
### [Debugging](#debugging)

<br/><br/><br/>

## What is Server Side Composition?
Amazon IVS provides a product call Real-time Streaming that lets upto 12 users share their video and audio in Real-time, similar to Google Meet and Zoom. Additionally, users have the ability to let upto 10K people view video and audio stream of these 12 users. But what if you wanted to easily let millions of people view the streams? In the past you would have to write some custom code to that let's one of the 12 users combine the 12 streams and send it to the Amazon IVS' Low-latency product. The downside was that a client would have to do extra processing and need extra bandwidth to upload this new stream. With Server Side composition this is done in the Cloud. All you do is, select your Real-time Stage, select your layout and select the Channel where you want to broadcast the stream. In this repo we will show you how to build a Real-time Stage application and how to setup a Lambda function that is triggered by an EventBridge event that let's you broadcast a Real-time Stage to a Low-latency Channel.

## Run the web application
Log into the Amazon AWS console and search for Amazon IVS. 

### Step 1. Create a Channel
1. On the left menu click on **Low-latency streaming > Channels**
2. Click on **Create channel**
3. Give the channel a name
4. Leave the defaults and click **Create channel**


### Step 2. Create a Stage
2. On the left hand menu click on **Real-time streaming > Stages**
3. Click on **Create a Stage**
4. Give the Stage a name and click **Create Stage**

### Step 3. Create participants tokens
You will need to create **2** participant tokens. Make sure you **DO NOT** refresh the stage details page after the tokens are created or you will need to recreate the tokens (they are one time use).
1. Click on **Create a a participant token**
2. Enter a user ID
3. Select **Publish** and **Subscribe** as capabilities
4. Click on **Add new attribute**
5. Enter **userId** as the key
6. Ener **user-1** as the value

Repeat steps 1 - 6, change the value in step 6 to be **user-2**
**Note**: Copy the tokens into a text editor. If you navigate away from the page, you will lose the tokens.

### Step 4. Run the code
Open a terminal and navigate to the base folder of the application:
1. Create a file called .env.local
2. Add the following variable to the file
```NEXT_PUBLIC_PLAYBACK_URL=```
3. Visit the Channel Details page for the channel you created in [Step 1](#step-1-create-a-channel). Find the **Playback URL** and copy it
4. Paste it on after the `=` sign in your **.env.local** file
5. Run `npm install`
6. Run `npm run dev`
7. Visit **http://localhost:3000**

### Step 5. Start a stage session
1. Take one of the paticipant tokens you created in [Step 3](#step-3-create-participants-tokens) and paste it into the **Participant Token** input box
2. Click **Join Stage**
3. Without closing the current tab, open a new tab in your browser and visit **http://localhost:3000**
4. Take the second participant token you created in [Step 3](#step-3-create-participants-tokens) and paste it into the **Participant Token** input box
5. Click **Join Stage** 

On both tabs you opened you should see two videos with the labels **user-1** and **user-2** on them

We haven't integrated with Low-latency streaming yet so you can go ahead and click on **Leave Stage** in BOTH your tabs to end streaming.

## Setup the Lambda function that broadcasts to a Low-latency channel

### Step 1. Setup the Lambda function
1. Search for the Lambda service in your AWS Console.
2. Click on **Functions** in the left menu
3. Click on **Create function**
4. Select **Author from scratch**
5. Give your function a name
6. Select the **Node.js 20.x** runtime
7. Select **x86_64** under Architecture 
8. Click **Create function**
9. Copy all the code from **lambda/lambda.js** into your **index.mjs** in your Lambad Code editor online and click **Deploy**
10. Update the code in **index.mjs** with the following:
  - **ARN** for the Real-time Stage you created in [Step 2](#step-2-create-a-stage) (line 6)
  - **Region** where you created the lambda function (line 19)
  - **ARN** for the Low-latency Channel in [Step 1](#step-1-create-a-channel) (line 62)
  - and click **Deploy**
11. You will have to update the IAM role for this Lambda function to give it permissions to run the following commands: **CreateEncoderConfiguration**, **StartComposition**, **ListEncoderConfigurations**
12. Click on the **Configuration** tab
13. Click on **Permissions** 
14. In the main panel under **Role name** click on the hyperlink for the role attached to the lambda.
15. In the new tab you are taken to the IAM roles page. Click **Add permissions**
16. Select **Create inline policy**
17. Under **Select a service** type **Interactive Video Service**
18. Search for and select the following **CreateEncoderConfiguration**, **StartComposition**, **ListEncoderConfigurations**
19. Under Resources select **All**
20. Click **Next**
21. Under Policy name type **ivs**
22. Click **Create policy**


### Step 1.1 Setup Layers for the Lambda function
Go to your Lambda Editor and click **Test**
1. Set the Event name to *test-1*
2. Click **Save**
3. Clikc **Test** on the main screen again.

In the event your try and run the code and it fails with this error:
```
Named export 'CreateEncoderConfigurationCommand' not found. The requested module '@aws-sdk/client-ivs-realtime' is a CommonJS module, which may not support all module.exports as named exports.\nCommonJS modules can always be imported via the default export
```
You will need to create a layer with the SDK uploaded. 
[This article](https://stackoverflow.com/questions/58703761/does-lambda-layer-include-aws-sdk) outlines the general steps

1. Outside the current project directory create a new folder called `lambda-layer` and `cd` into the folder
2. Run `npm install "@aws-sdk/client-ivs-realtime"`
3. Run `mkdir nodejs`
4. Run `mv node_modules/ nodejs/`
5. Run `zip -r aws-sdk.zip nodejs/`
6. In the AWS console in the left menu click on  **Additional Resources > Layers**
7. Click **Create layer**
8. Name: **aws-sdk-client-ivs-realtime**
9. Select: **Upload a .zip file**
10. Click **Upload**
11. Navgiation **<your directory>/lambda-layer** and select **aws-sdk.zip**
12. Select Compatible architectures **x86_64**
13. Select Runtimes: **Node.js 20.x**
14. Click **Create**


Once you create the layer, you will need to add to your Lambda function.
1. Click into the details page for your Lambda function
2. Scroll to the bottom of the page where it says **Layers**
3. Click on **Add a Layer**
4. Select **Custom layers**
5. From the Custom layers dropdown select the layer you just created
6. Click **Add**



### Step 2. Setup the EventBridge Rule
1. Search for the Amazon EventBridge service in your AWS Console.
2. Click on **Rules** in the left menu and click **Create rule*
3. Give the rule a name like **Server-side-composition-test**
4. Rule type **Rule with an event pattern**
5. Click **Next**
6. Under Event soure select **AWS events for EventBridge partner events**
7. Sample Event type select  **AWS events**
8. Select Sample events select  **IVS Stage Update**
9. Creation method select  **Use pattern form**
10. Event pattern > Event Source select **AWS services**
11. AWS Service select **Interactive Video Service(IVS)**
12. Event type select **IVS Stage Update**
13. Click **Next**
14. Under Target 1 select **AWS Service**
15. Select **Lambda Function**
16. Select the functin you created in the [Step 1](#step-1-setup-the-lambda-function)
17. Click **Next**
18. Click **Next** again
19. Click **Create rule**

## Test Server side composition
Here we will see if we can playback your server side composition.

1. Redo all the steps in [Run the code](#step-4-run-the-code) and [Start a stage session](#step-5-start-a-stage-session) but DONT leave the stage.
2. Visit http://localhost:3000/playback

You should be able to see yourself side by side. You might want to mute your microphone or speakers to avoid feedback.
Additionally visit your channel details page in the AWS console, you will be able to see 


##  Debugging
- Make sure you ARN for the Stage and Channel is setup properly in the Lambda fuction
- Make sure your region is setup properly in your Lambda function
- In your Lambda function click on the **Monitor** tab and click **View CloudWatch logs**