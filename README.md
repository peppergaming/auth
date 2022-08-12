# Pepper Auth SDK

Easy Auth for web3 gaming apps.

[//]: # (TODO insert here a nice pic)

Developing web3 apps is not easy, even more for games developers. Our Auth SDK allows easily to integrate a web3 Login module in your app.
Passwordless, non-custodial Login. Integrate our SDK in your game in a few lines of code.

By using our SDK you can build a login infrastructure based on social logins or email and, for more advanced users, also external wallets.

## Demo Project
If you want to see the SDK in action, checkout our [demo project](https://github.com/peppergaming/pepper-star-battle).

## Supported authentication  methods

Currently, we support the following authentication methods:

| Method        | Type              |
|:--------------|:------------------|
| Google        | Oauth             |
| Discord       | Oauth             |
| Twitch        | Oauth             |
| Email         | Passwordless flow |
| Metamask      | External wallet   |
| WalletConnect | External wallet   |


## Getting started
### Installation

```shell
npm i --save @peppergaming/auth
// or
yarn add --save @peppergaming/auth
```

### Usage
To quickly have access to the several login methods we support, just import the sdk and initialize it

```typescript
import {PepperLogin} from "@peppergaming/auth"

// ... 
const loginSDK = new PepperLogin();
await loginSDK.init()

// ...
// You can login with some auth method
const web3Provider = await loginSDK.connectTo("google")

//...
// When you want to logout
await loginSDK.logout()
```
That's it, now you  have a web3 provider available in your app!

For more documentation about what a web3 provider is, checkout the [ethers Provider documentation](https://docs.ethers.io/v5/api/providers/provider/).

### Advanced usage
Your login infrastructure may need further control about what happens during the login lifecycle.
The [PepperLogin](https://peppergaming.github.io/auth/classes/PepperLogin.html) class can be instantiated with an [options object](https://peppergaming.github.io/auth/interfaces/PepperLoginOptions.html)
You can configure several SDK settings, one very useful option is the [eventSubscriber](https://peppergaming.github.io/auth/interfaces/EventSubscriber.html).
Here's an example of SDK initialization with an eventSubscriber option.

```typescript
import {PepperLogin, UserInfo} from "@peppergaming/auth"


const eventSubscriber: EventSubscriber = {
  async onConnecting() {
     // put here your logic during connection
     console.log("Connecting");
  },
  async onAuthChallengeSigning() {
    // put here your logic during signing challenge
     console.log("Signing Challenge");
  },
  async onConnected(userInfo: UserInfo, pepperAccessToken: string) {
    // put here your logic for post connection
    console.log("Connected with user info: ", userInfo);
  },
  async onDisconnected() {
   // put here your logic for post disconnection
     console.log("Disconnected");
  },
  async onErrored(error: any) {
  // put here your logic for handling errors
     console.log("Connection error");
  },
};

// ... 
const loginSDK = new PepperLogin({eventSubscriber});

await loginSDK.init()
```


## Code documentation
For more details about the code please see the specific [documentation](https://peppergaming.github.io/auth/).

