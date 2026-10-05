// Metro num monorepo pnpm: enxerga os pacotes do workspace (TypeScript sem
// build) e troca a libsodium em WebAssembly pela versão nativa.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projeto = __dirname;
const raiz = path.resolve(projeto, '../..');
const config = getDefaultConfig(projeto);

config.watchFolders = [raiz];
config.resolver.nodeModulesPaths = [
  path.resolve(projeto, 'node_modules'),
  path.resolve(raiz, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;

// O Hermes não roda WebAssembly: react-native-libsodium expõe a mesma API.
const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (contexto, modulo, plataforma) => {
  if (modulo === 'libsodium-wrappers-sumo') {
    return contexto.resolveRequest(contexto, 'react-native-libsodium', plataforma);
  }
  return (resolverPadrao ?? contexto.resolveRequest)(contexto, modulo, plataforma);
};

module.exports = config;
