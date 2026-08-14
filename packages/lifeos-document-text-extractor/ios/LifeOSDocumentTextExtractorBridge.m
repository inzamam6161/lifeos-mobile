#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LifeOSDocumentTextExtractor, NSObject)
RCT_EXTERN_METHOD(extractPdfText:(NSString *)uri
                  password:(NSString * _Nullable)password
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
