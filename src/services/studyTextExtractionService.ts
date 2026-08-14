import {Dirs,FileSystem} from 'react-native-file-access';
import {extractPdfText,isPdfTextExtractorAvailable} from 'lifeos-document-text-extractor';
import type {StudyMaterial} from '../features/study/types';
import {buildKnowledgeChunks,docxXmlToText,normalizeExtractedText,type TextSection} from '../utils/documentText';

export type StudyTextExtractionResult = {
  state: 'ready' | 'needs_ocr';
  bodyText: string | null;
  extractionMethod: 'pdf_native' | 'docx_xml' | 'plain_text';
  chunks: ReturnType<typeof buildKnowledgeChunks>;
};

const MAX_IMPORT_BYTES = 50 * 1024 * 1024;
const MAX_BODY_TEXT_CHARS = 600_000;

function localPath(uri:string){
  if(uri.startsWith('file://')) return decodeURIComponent(uri.slice('file://'.length));
  return uri;
}

function extension(name:string|null){
  const match=(name??'').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1]??'';
}

async function extractDocx(uri:string):Promise<string>{
  const source=localPath(uri);
  const target=`${Dirs.CacheDir}/lifeos-docx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await FileSystem.mkdir(target);
  try{
    await FileSystem.unzip(source,target);
    const xmlPath=`${target}/word/document.xml`;
    if(!(await FileSystem.exists(xmlPath))) throw new Error('DOCX is missing word/document.xml.');
    const xml=await FileSystem.readFile(xmlPath,'utf8');
    return docxXmlToText(xml);
  }finally{
    try{await FileSystem.unlink(target);}catch{/* cache cleanup is best effort */}
  }
}

async function extractPlainText(uri:string){
  return normalizeExtractedText(await FileSystem.readFile(localPath(uri),'utf8'));
}

export async function extractStudyMaterialText(material:StudyMaterial):Promise<StudyTextExtractionResult>{
  if(!material.localUri) throw new Error('This material has no local file.');
  if(material.sizeBytes!=null&&material.sizeBytes>MAX_IMPORT_BYTES) throw new Error('Text indexing is limited to files up to 50 MB on-device.');
  if(material.kind==='image') return {state:'needs_ocr',bodyText:null,extractionMethod:'plain_text',chunks:[]};

  const ext=extension(material.originalName);
  let sections:TextSection[]=[];
  let method:StudyTextExtractionResult['extractionMethod']='plain_text';

  if(material.kind==='pdf'||ext==='pdf'){
    if(!isPdfTextExtractorAvailable()) throw new Error('The LifeOS PDF text native module is not installed in this build.');
    const result=await extractPdfText(material.localUri);
    sections=result.pages.map(page=>({text:page.text,pageNumber:page.pageNumber,sourceLocator:`Page ${page.pageNumber}`}));
    method='pdf_native';
  }else if(ext==='docx'||material.mimeType==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
    sections=[{text:await extractDocx(material.localUri),sourceLocator:'DOCX body'}];
    method='docx_xml';
  }else{
    sections=[{text:await extractPlainText(material.localUri),sourceLocator:'Text document'}];
    method='plain_text';
  }

  const chunks=buildKnowledgeChunks(sections);
  const fullText=normalizeExtractedText(sections.map(x=>x.text).filter(Boolean).join('\n\n'));
  if(!fullText||fullText.length<20||!chunks.length){
    if(method==='pdf_native') return {state:'needs_ocr',bodyText:null,extractionMethod:method,chunks:[]};
    throw new Error('No readable text was found in this document.');
  }
  return {state:'ready',bodyText:fullText.slice(0,MAX_BODY_TEXT_CHARS),extractionMethod:method,chunks};
}
