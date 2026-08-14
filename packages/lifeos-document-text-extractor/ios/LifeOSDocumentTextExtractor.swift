import Foundation
import PDFKit
import React

@objc(LifeOSDocumentTextExtractor)
final class LifeOSDocumentTextExtractor: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(extractPdfText:password:resolver:rejecter:)
  func extractPdfText(_ uri: String, password: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      let url: URL
      if uri.hasPrefix("file://"), let parsed = URL(string: uri) { url = parsed }
      else { url = URL(fileURLWithPath: uri) }
      guard FileManager.default.fileExists(atPath: url.path) else { reject("PDF_NOT_FOUND", "PDF file was not found.", nil); return }
      guard let document = PDFDocument(url: url) else { reject("PDF_OPEN_FAILED", "Could not open PDF.", nil); return }
      if document.isLocked {
        guard let password, !password.isEmpty, document.unlock(withPassword: password) else { reject("PDF_PASSWORD_REQUIRED", "PDF is password protected.", nil); return }
      }
      var pages: [[String: Any]] = []
      for index in 0..<document.pageCount {
        let text = document.page(at: index)?.string ?? ""
        pages.append(["pageNumber": index + 1, "text": text])
      }
      resolve(["pageCount": document.pageCount, "pages": pages])
    }
  }
}
