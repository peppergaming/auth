
interface PepperLoginOptions {
  clientId: string
}

export function PepperLogin(options: PepperLoginOptions) {
  const clientId = options.clientId;
  this.getClientId = () => {
    return clientId
  }

}
