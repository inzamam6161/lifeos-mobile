require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'lifeos-document-text-extractor'
  s.version = package['version']
  s.summary = 'LifeOS local PDF text extraction for React Native CLI'
  s.homepage = 'https://example.invalid/lifeos'
  s.license = { :type => 'MIT' }
  s.author = 'LifeOS'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => 'https://example.invalid/lifeos-document-text-extractor.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.frameworks = 'PDFKit'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
