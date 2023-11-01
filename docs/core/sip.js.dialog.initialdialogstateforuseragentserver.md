<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [sip.js](./sip.js.md) &gt; [Dialog](./sip.js.dialog.md) &gt; [initialDialogStateForUserAgentServer](./sip.js.dialog.initialdialogstateforuseragentserver.md)

## Dialog.initialDialogStateForUserAgentServer() method

The UAS then constructs the state of the dialog. This state MUST be maintained for the duration of the dialog. https://tools.ietf.org/html/rfc3261\#section-12.1.1

<b>Signature:</b>

```typescript
static initialDialogStateForUserAgentServer(incomingRequestMessage: IncomingRequestMessage, toTag: string, early?: boolean): DialogState;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  incomingRequestMessage | [IncomingRequestMessage](./sip.js.incomingrequestmessage.md) | Incoming request message creating dialog. |
|  toTag | string | Tag in the To field in the response to the incoming request. |
|  early | boolean |  |

<b>Returns:</b>

[DialogState](./sip.js.dialogstate.md)
