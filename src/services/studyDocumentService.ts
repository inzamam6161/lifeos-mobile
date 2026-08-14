import {errorCodes,isErrorWithCode,keepLocalCopy,pick,types} from '@react-native-documents/picker';
import {viewDocument} from '@react-native-documents/viewer';
import type {ImportMaterialInput,StudyMaterialKind} from '../features/study/types';

function kindFor(mimeType:string|null,name:string|null):Exclude<StudyMaterialKind,'note'>{
  const mime=(mimeType??'').toLowerCase(); const lower=(name??'').toLowerCase();
  if(mime==='application/pdf'||lower.endsWith('.pdf')) return 'pdf';
  if(mime.startsWith('image/')||/\.(png|jpe?g|webp|heic)$/i.test(lower)) return 'image';
  return 'document';
}

export async function pickStudyDocument(subjectId:string):Promise<ImportMaterialInput|null>{
  try{
    const [file]=await pick({type:[types.pdf,types.images,types.docx,types.plainText],allowMultiSelection:false,mode:'import'});
    if(!file.hasRequestedType) throw new Error('Unsupported file type. Choose a PDF, image, DOCX or text file.');
    const name=file.name??'study-material';
    const [copy]=await keepLocalCopy({files:[{uri:file.uri,fileName:name}],destination:'documentDirectory'});
    if(copy.status!=='success') throw new Error(copy.copyError||'Could not keep an offline copy.');
    return {subjectId,title:name.replace(/\.[^.]+$/,''),kind:kindFor(file.type,name),localUri:copy.localUri,mimeType:file.type??null,originalName:name,sizeBytes:file.size??null};
  }catch(error){
    if(isErrorWithCode(error)&&error.code===errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}

export async function previewStudyDocument(uri:string,mimeType:string|null){
  await viewDocument({uri,mimeType:mimeType??undefined,grantPermissions:'read'});
}
