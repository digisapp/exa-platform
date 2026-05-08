// Storage path conventions for contract artifacts.
// Lives in its own tiny module so importers don't pull in heavy PDF deps
// (e.g. @react-pdf/renderer) just to know the path.

export function signedContractStoragePath(contractId: string) {
  return `contracts/signed/${contractId}.pdf`;
}
