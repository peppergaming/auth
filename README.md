# Peppergaming Auth SDK

Easy Auth for web3 gaming apps.

[//]: # (TODO insert here a nice pic)

Developing web3 apps is not easy, even more for games developers. Our Auth SDK allows easily to integrate a web3 Login module in your app.
Passwordless, non-custodial Login. Integrate our SDK in your game in a few lines of code.

By using our SDK you can build a login infrastructure based on social logins or email and, for more advanced users, also external wallets.
Currently, we support the following authentication methods:

## Supported authentication  methods

|   	 Method    |       Type        |
|:-------------:|:-----------------:|
|    Google     |       Oauth       |
|    Discord    |       Oauth       |
|    Twitch     |       Oauth       |
|     Email     | Passwordless flow |
|   Metamask    |  External wallet  |
| WalletConnect |  External wallet  |


## Getting started
### Installation
#### npm
```shell
npm i --save @peppergaming/auth
```

#### yarn
```shell
yarn add --save @peppergaming/auth
```
### Usage
To quickly have access to the several login methods we support, just import the sdk and initialize it

```typescript
import {PepperLogin} from "@peppergaming/auth"

// ... 
const loginSDK = new PepperLogin();

await loginSDK.init()

// This will trigger the login flow
const wallet = await loginSDK.connectTo("google")
```
That's it, now you  have a web3 wallet available in your app!

## Code documentation
For more details about the code please see the specific [documentation](https://peppergaming.github.io/auth/).

