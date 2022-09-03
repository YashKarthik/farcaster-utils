require('dotenv').config();
const got = require("got");
const { providers, Contract, utils } = require('ethers');

const REGISTRY_CONTRACT_ADDRESS = '0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1';
const REGISTRY_ABI = [
  {
    name: 'getDirectoryUrl',
    inputs: [{ internalType: 'bytes32', name: 'username', type: 'bytes32' }],
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: "view",
    type: 'function',
  },
  {
    name: 'addressToUsername',
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: "view",
    type: 'function',
  },
]

const basicSetup = async () => {
  const provider = new providers.AlchemyProvider('rinkeby', process.env.ALCHEMY_API_KEY);
  const block = await provider.getBlockNumber();
  const registryContract = new Contract(REGISTRY_CONTRACT_ADDRESS, REGISTRY_ABI, provider);

  console.log("Block: ", block);

  return {
    provider,
    registryContract
  };
}

const getDirectoryUrl = async (uname) => {
  const { registryContract } = await basicSetup();

  const username = uname;
  const byte32Name = utils.formatBytes32String(username);
  const directoryUrl = await registryContract.getDirectoryUrl(byte32Name);

  return directoryUrl;
}

const getDirectoryBlob = async (uname) => {
  const directoryUrl = await getDirectoryUrl(uname);
  const directoryResponse = await got(directoryUrl);
  const directory = JSON.parse(directoryResponse.body);

  return directory;
}

const getCast = async (uname) => {
  const directory = await getDirectoryBlob(uname);

  const addressActivityUrl = directory.body.addressActivityUrl;
  const addressActivityResponse = await got(addressActivityUrl);
  const addressActivity = JSON.parse(addressActivityResponse.body);
  const cast = addressActivity[0]

  return cast;
}

const verifyCastSignature = async (uname) => {
  const cast = await getCast(uname);
  const stringifiedCastBody = JSON.stringify(cast.body);
  const calculatedHash = utils.keccak256(utils.toUtf8Bytes(stringifiedCastBody));
  const expectedHash = cast.merkleRoot;

  if (calculatedHash === expectedHash) console.log('hashes match');
  else console.log('hashes match');

  const recoveredAddress = utils.verifyMessage(cast.merkleRoot, cast.signature);
  const expectedAddress = cast.body.address;

  if (recoveredAddress === expectedAddress) console.log('addresses match');
  else console.log('addresses do not match');

  return {
    expectedHash,
    expectedAddress,
  }
}


const verifyAddressOwnsName = async (uname) => {
  const { registryContract } = await basicSetup();
  const { expectedAddress } = await verifyCastSignature(uname);

  const cast = await getCast(uname);

  const encodedUsername = registryContract.addressToUsername(expectedAddress);
  const castUsername = cast.body.username;

  if (encodedUsername === castUsername) console.log('unames match');
  else console.log('unames do not match');
}

verifyAddressOwnsName('yashkarthik');
