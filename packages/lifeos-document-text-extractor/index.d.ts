export type PdfTextPage={pageNumber:number;text:string};
export type PdfTextResult={pageCount:number;pages:PdfTextPage[]};
export function isPdfTextExtractorAvailable():boolean;
export function extractPdfText(uri:string,password?:string|null):Promise<PdfTextResult>;
