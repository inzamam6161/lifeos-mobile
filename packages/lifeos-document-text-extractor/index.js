const {NativeModules}=require('react-native');
function nativeModule(){return NativeModules.LifeOSDocumentTextExtractor;}
function isPdfTextExtractorAvailable(){return Boolean(nativeModule()&&typeof nativeModule().extractPdfText==='function');}
async function extractPdfText(uri,password){const module=nativeModule();if(!module)throw new Error('LifeOSDocumentTextExtractor native module is unavailable. Rebuild the native app after installing the local package.');return module.extractPdfText(uri,password??null);}
module.exports={extractPdfText,isPdfTextExtractorAvailable};
