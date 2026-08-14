package com.lifeos.documenttextextractor

import android.net.Uri
import com.facebook.react.bridge.*
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File

class LifeOSDocumentTextExtractorModule(private val context: ReactApplicationContext):ReactContextBaseJavaModule(context){
  override fun getName()="LifeOSDocumentTextExtractor"

  private fun fileFor(uriValue:String):File{
    val uri=Uri.parse(uriValue)
    val path=if(uri.scheme=="file") uri.path else if(uri.scheme.isNullOrBlank()) uriValue else null
    if(path.isNullOrBlank()) throw IllegalArgumentException("LifeOS PDF extraction requires a retained local file URI.")
    return File(path)
  }

  @ReactMethod
  fun extractPdfText(uri:String,password:String?,promise:Promise){
    try{
      PDFBoxResourceLoader.init(context)
      val file=fileFor(uri)
      if(!file.exists()){promise.reject("PDF_NOT_FOUND","PDF file was not found.");return}
      val document=if(password.isNullOrEmpty()) PDDocument.load(file) else PDDocument.load(file,password)
      document.use { pdf ->
        val pages=Arguments.createArray()
        for(pageNumber in 1..pdf.numberOfPages){
          val stripper=PDFTextStripper().apply { startPage=pageNumber; endPage=pageNumber }
          val map=Arguments.createMap()
          map.putInt("pageNumber",pageNumber)
          map.putString("text",stripper.getText(pdf)?:"")
          pages.pushMap(map)
        }
        val result=Arguments.createMap()
        result.putInt("pageCount",pdf.numberOfPages)
        result.putArray("pages",pages)
        promise.resolve(result)
      }
    }catch(error:Throwable){
      promise.reject("PDF_EXTRACT_FAILED",error.message?:"PDF text extraction failed.",error)
    }
  }
}
