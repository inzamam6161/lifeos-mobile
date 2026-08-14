package com.lifeos.documenttextextractor

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LifeOSDocumentTextExtractorPackage:ReactPackage{
  override fun createNativeModules(reactContext:ReactApplicationContext):List<NativeModule> = listOf(LifeOSDocumentTextExtractorModule(reactContext))
  override fun createViewManagers(reactContext:ReactApplicationContext):List<ViewManager<*,*>> = emptyList()
}
